import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
import json
import logging
import traceback
import tempfile
from contextlib import asynccontextmanager
from typing import Optional, Any

import boto3
import inngest
import inngest.fast_api
import numpy as np
import essentia.standard as es
from fastapi import FastAPI
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchAny,
)

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("embedderserver")

# ─── Config from env ─────────────────────────────────────────────────────────
AWS_BUCKET = os.environ.get("AWS_PRODUCTION_BUCKET", "onemelodyproduction")
AWS_REGION = os.environ.get("AWS_CONFIG_REGION", "ap-south-1")
AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.environ.get("AWS_SECRET_KEY")
QDRANT_API_KEY = os.environ.get("QUADRANT_DB_API_KEY")
QDRANT_ENDPOINT = os.environ.get("QUADRANT_DB_ENDPOINT")
QDRANT_COLLECTION = os.environ.get("QDRANT_COLLECTION", "songs")
INNGEST_EVENT_KEY = os.environ.get("INNGEST_EVENT_KEY", "local")
INNGEST_SIGNING_KEY = os.environ.get("INNGEST_SIGNING_KEY", "")

# Validate critical config
if not all([AWS_ACCESS_KEY, AWS_SECRET_KEY, QDRANT_API_KEY, QDRANT_ENDPOINT]):
    missing = [
        k
        for k, v in {
            "AWS_ACCESS_KEY": AWS_ACCESS_KEY,
            "AWS_SECRET_KEY": AWS_SECRET_KEY,
            "QUADRANT_DB_API_KEY": QDRANT_API_KEY,
            "QUADRANT_DB_ENDPOINT": QDRANT_ENDPOINT,
        }.items()
        if not v
    ]
    log.error(f"Missing critical environment variables: {', '.join(missing)}")

VECTOR_DIM = 384

# ─── Global handles ───────────────────────────────────────────────────────────
lyrics_model: Optional[SentenceTransformer] = None
meta_model: Optional[SentenceTransformer] = None
qdrant: Optional[QdrantClient] = None
s3_client: Optional[Any] = None

# ─── Inngest client ───────────────────────────────────────────────────────────
inngest_client = inngest.Inngest(
    app_id="embedderserver",
    event_key=INNGEST_EVENT_KEY,
    signing_key=INNGEST_SIGNING_KEY,
    is_production=os.environ.get("NODE_ENV") == "production",
)


# ─── Startup ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global lyrics_model, meta_model, qdrant, s3_client

    log.info("Loading paraphrase-multilingual-MiniLM-L12-v2 ...")
    lyrics_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

    log.info("Loading all-MiniLM-L6-v2 ...")
    meta_model = SentenceTransformer("all-MiniLM-L6-v2")

    log.info("Connecting to Qdrant ...")
    qdrant = QdrantClient(url=QDRANT_ENDPOINT, api_key=QDRANT_API_KEY)
    _ensure_collection()

    log.info("Initialising S3 client ...")
    s3_client = boto3.client(
        "s3",
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
    )

    log.info("embedderserver ready")
    yield
    log.info("embedderserver shutting down ...")


app = FastAPI(title="embedderserver", lifespan=lifespan)


# ─── Qdrant collection bootstrap ─────────────────────────────────────────────
def _ensure_collection():
    existing = [c.name for c in qdrant.get_collections().collections]
    if QDRANT_COLLECTION not in existing:
        log.info(f"Creating Qdrant collection '{QDRANT_COLLECTION}' ...")
        qdrant.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )
        log.info("Collection created")

    # Ensure payload index for filtering
    log.info(f"Ensuring payload index for 'songId' in '{QDRANT_COLLECTION}'")
    qdrant.create_payload_index(
        collection_name=QDRANT_COLLECTION,
        field_name="songId",
        field_schema="keyword",
    )


# ═════════════════════════════════════════════════════════════════════════════
#  INNGEST FUNCTION
#  Triggered by:  "vector-embedding-job"  (fired from audioProcessingFunction)
#  On success fires: "updateSongsTableAfterProcessingCompletion"
# ═════════════════════════════════════════════════════════════════════════════


@inngest_client.create_function(
    fn_id="generate-vector-embeddings",
    trigger=inngest.TriggerEvent(event="vector-embedding-job"),
    retries=3,
)
async def generate_embeddings_fn(
    ctx: inngest.Context,
) -> dict:
    """
    Receives:
      ctx.event.data = {
        jobId:        int,
        songId:       int,
        vectorId:     str,
        processedKey: str,   e.g. "songs/42"
        title:        str,
        artistName:   str,
        genre:        str,
      }
    """
    data = ctx.event.data
    job_id = data["jobId"]
    song_id = data["songId"]
    vector_id = data["vectorId"]
    processed_key = data["processedKey"]
    title = data["title"]
    artist_name = data["artistName"]
    genre = data.get("genre", "Unknown")

    log.info(f"Starting embeddings job={job_id} song={job_id} vectorId={vector_id}")

    try:
        # ── Step 1: Download audio from S3 ───────────────────────────────────────
        audio_path = await ctx.step.run(
            "download-audio",
            lambda: _download_audio(processed_key),
        )

        # ── Step 2: Download caption.json from S3 ────────────────────────────────
        caption_data = await ctx.step.run(
            "download-caption",
            lambda: _download_caption_as_dict(processed_key),
        )

        # ── Step 3: Extract clean lyrics text ────────────────────────────────────
        lyrics_text = await ctx.step.run(
            "extract-lyrics-text",
            lambda: _extract_lyrics(caption_data),
        )

        # ── Step 4: Generate lyrics vector ───────────────────────────────────────
        lyrics_vec = await ctx.step.run(
            "generate-lyrics-vector",
            lambda: _lyrics_vector(lyrics_text),
        )

        # ── Step 5: Generate metadata vector ─────────────────────────────────────
        meta_vec = await ctx.step.run(
            "generate-metadata-vector",
            lambda: _metadata_vector(title, artist_name, genre),
        )

        # ── Step 6: Generate audio feature vector ────────────────────────────────
        audio_vec = await ctx.step.run(
            "generate-audio-vector",
            lambda: _audio_vector(audio_path),
        )

        # ── Step 7: Weighted combination ─────────────────────────────────────────
        final_vec = await ctx.step.run(
            "combine-vectors",
            lambda: _combine(lyrics_vec, audio_vec, meta_vec),
        )

        # ── Step 8: Upsert into Qdrant ───────────────────────────────────────────
        qdrant_point_id = await ctx.step.run(
            "upsert-qdrant",
            lambda: _upsert_qdrant(
                vector_id=vector_id,
                final_vec=final_vec,
                lyrics_vec=lyrics_vec,
                audio_vec=audio_vec,
                meta_vec=meta_vec,
                payload={
                    "jobId": job_id,
                    "songId": song_id,
                    "title": title,
                    "artistName": artist_name,
                    "genre": genre,
                },
            ),
        )

        # ── Step 9: Fire vector-embedding-completed ───────────────
        #    This is picked up by the new setEmbeddingFlagsFunction in JS
        await ctx.step.send_event(
            "trigger-set-embedding-flags",
            inngest.Event(
                name="vector-embedding-completed",
                data={
                    "jobId": job_id,
                    "vectorId": qdrant_point_id,
                    "qdrantPointId": qdrant_point_id,
                },
            ),
        )

        log.info(f"Embeddings done — Qdrant pointId={qdrant_point_id}")
        return {
            "success": True,
            "vectorId": vector_id,
            "qdrantPointId": qdrant_point_id,
        }
    except Exception as e:
        log.error(f"❌ Error in generate_embeddings_fn: {str(e)}")
        log.error(traceback.format_exc())
        raise e


@inngest_client.create_function(
    fn_id="generate-user-feed-fn",
    trigger=inngest.TriggerEvent(event="feed/generate"),
    retries=3,
)
async def generate_user_feed_fn(ctx: inngest.Context) -> dict:
    data = ctx.event.data
    positive_vector_ids = data.get("positiveVectorIds", [])
    exclude_song_ids = data.get("excludeSongIds", [])
    limit = data.get("limit", 15)

    if not positive_vector_ids:
        return {"songIds": []}

    try:
        must_not_filter = None
        if exclude_song_ids:
            must_not_filter = Filter(
                must_not=[
                    FieldCondition(key="songId", match=MatchAny(any=exclude_song_ids))
                ]
            )

        log.info(
            f"Generating feed based on {len(positive_vector_ids)} positive examples"
        )

        recommendation_result = qdrant.query_points(
            collection_name=QDRANT_COLLECTION,
            query=positive_vector_ids,
            limit=limit,
            query_filter=must_not_filter,
            with_payload=["songId"],
        ).points

        song_ids = [
            str(point.payload.get("songId"))
            for point in recommendation_result
            if point.payload and point.payload.get("songId") is not None
        ]
        log.info(f"Feed generated successfully: {song_ids}")

        return {"songIds": song_ids}
    except Exception as e:
        log.error(f"❌ Error in generate_user_feed_fn: {str(e)}")
        log.error(traceback.format_exc())
        return {"songIds": []}


# ── Register Inngest functions with FastAPI ───────────────────────────────────
inngest.fast_api.serve(
    app,
    inngest_client,
    [generate_embeddings_fn, generate_user_feed_fn],
    serve_path="/api/inngest",
)


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS  (pure functions — no side effects outside of S3 / Qdrant)
# ══════════════════════════════════════════════════════════════════════════════


def _download_audio(processed_key: str) -> str:
    """
    Downloads audio to a temp file and returns the local path.
    Tries original.mp3 first, falls back to audio.mp3.
    Returns path string — safe to pass between Inngest steps.
    """
    tmp_path = tempfile.mktemp(suffix=".mp3")
    for filename in ("original.mp3", "audio.mp3"):
        key = f"{processed_key}/{filename}"
        try:
            log.info(f"Downloading s3://{AWS_BUCKET}/{key}")
            s3_client.download_file(AWS_BUCKET, key, tmp_path)
            log.info("Audio downloaded")
            return tmp_path
        except Exception:
            continue
    raise RuntimeError(f"No audio file found under prefix: {processed_key}")


def _download_caption_as_dict(processed_key: str) -> dict:
    """
    Downloads caption.json and returns its parsed content as a dict.
    Returns dict so it can be serialised between Inngest steps.
    """
    tmp_path = tempfile.mktemp(suffix=".json")
    key = f"{processed_key}/caption.json"
    log.info(f"Downloading s3://{AWS_BUCKET}/{key}")
    try:
        s3_client.download_file(AWS_BUCKET, key, tmp_path)
    except Exception as exc:
        raise RuntimeError(f"caption.json not found at {key}: {exc}")

    with open(tmp_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    os.remove(tmp_path)
    return data


def _extract_lyrics(caption_data: dict) -> str:
    """
    Reads Sarvam AI diarized_transcript format.
    Returns all transcript texts joined as one string.
    """
    entries = caption_data.get("diarized_transcript", {}).get("entries", []) or []
    texts = [e["transcript"].strip() for e in entries if e.get("transcript")]

    if texts:
        return " ".join(texts)

    # fallback: top-level transcript string
    return caption_data.get("transcript", "").strip()


def _lyrics_vector(text: str) -> list:
    if not text.strip():
        log.warning("Empty lyrics — using zero vector")
        return [0.0] * VECTOR_DIM

    # Truncate to ~400 words to stay under 512 token model limit
    words = text.split()
    if len(words) > 400:
        text = " ".join(words[:400])

    vec = lyrics_model.encode(text, normalize_embeddings=True)
    return vec.tolist()


def _metadata_vector(title: str, artist: str, genre: str) -> list:
    sentence = f"Song: {title}. Artist: {artist}. Genre: {genre}."
    vec = meta_model.encode(sentence, normalize_embeddings=True)
    return vec.tolist()


def _audio_vector(audio_path: str) -> list:
    # Decode MP3 → raw mono signal at 44100 Hz
    audio = es.MonoLoader(filename=audio_path, sampleRate=44100)()

    # BPM & rhythm
    bpm, _, beat_conf, _, _ = es.RhythmExtractor2013(method="multifeature")(audio)
    norm_bpm = float(bpm) / 250.0
    beat_conf = float(beat_conf)

    # Key & scale
    key_str, scale_str, key_conf = es.KeyExtractor()(audio)
    KEY_MAP = {
        "C": 0,
        "C#": 1,
        "D": 2,
        "D#": 3,
        "E": 4,
        "F": 5,
        "F#": 6,
        "G": 7,
        "G#": 8,
        "A": 9,
        "A#": 10,
        "B": 11,
    }
    norm_key = KEY_MAP.get(key_str, 0) / 11.0
    scale_bin = 1.0 if scale_str == "major" else 0.0
    key_conf = float(key_conf)

    # Loudness & energy
    loudness = abs(float(es.Loudness()(audio))) / 60.0
    energy = float(es.Energy()(audio))

    # Danceability
    danceability = float(es.Danceability()(audio)[0])

    # MFCC + spectral across all frames
    w_algo = es.Windowing(type="hann")
    spec_algo = es.Spectrum()
    mfcc_algo = es.MFCC(numberCoefficients=13)
    sc_algo = es.SpectralCentroidTime()
    ro_algo = es.RollOff()

    mfcc_frames, sc_vals, ro_vals = [], [], []
    for frame in es.FrameGenerator(audio, frameSize=2048, hopSize=512):
        windowed = w_algo(frame)
        spectrum = spec_algo(windowed)
        _, coeffs = mfcc_algo(spectrum)
        mfcc_frames.append(coeffs)
        sc_vals.append(sc_algo(frame))
        ro_vals.append(ro_algo(spectrum))

    mfcc_mean = np.mean(mfcc_frames, axis=0).tolist()  # 13 values
    norm_sc = float(np.mean(sc_vals)) / 10000.0
    norm_ro = float(np.mean(ro_vals)) / 22050.0

    # 23-value feature array
    features = [
        norm_bpm,
        beat_conf,
        norm_key,
        scale_bin,
        key_conf,
        loudness,
        energy,
        danceability,
        norm_sc,
        norm_ro,
    ] + mfcc_mean  # total: 23

    # Pad to VECTOR_DIM
    features += [0.0] * (VECTOR_DIM - len(features))

    # L2 normalise
    arr = np.array(features, dtype=np.float32)
    norm = np.linalg.norm(arr)
    return (arr / norm if norm > 0 else arr).tolist()


def _combine(lyrics_vec: list, audio_vec: list, meta_vec: list) -> list:
    combined = (
        np.array(lyrics_vec, dtype=np.float32) * 0.40
        + np.array(audio_vec, dtype=np.float32) * 0.45
        + np.array(meta_vec, dtype=np.float32) * 0.15
    )
    norm = np.linalg.norm(combined)
    return (combined / norm if norm > 0 else combined).tolist()


def _upsert_qdrant(
    vector_id: str,
    final_vec: list,
    lyrics_vec: list,
    audio_vec: list,
    meta_vec: list,
    payload: dict,
) -> str:
    result = qdrant.upsert(
        collection_name=QDRANT_COLLECTION,
        points=[
            PointStruct(
                id=vector_id,
                vector=final_vec,
                payload={
                    **payload,
                    "lyrics_vector": lyrics_vec,
                    "audio_vector": audio_vec,
                    "meta_vector": meta_vec,
                },
            )
        ],
    )
    if result.status.name != "COMPLETED":
        raise RuntimeError(f"Qdrant upsert failed: {result.status}")
    return vector_id


from pydantic import BaseModel
from typing import List


class WeightedSignal(BaseModel):
    vectorId: str
    weight: float


class RecommendRequest(BaseModel):
    positiveSignals: List[WeightedSignal]
    excludeSongIds: List[str] = []
    limit: int = 15


@app.post("/recommend")
async def recommend_endpoint(body: RecommendRequest):
    """
    Direct REST endpoint for NestJS to call.
    Calculates weighted centroid from positive signals and searches Qdrant.
    """
    if not body.positiveSignals:
        return {"songIds": []}

    try:
        # 1. Fetch raw vectors for all positive signals
        vector_ids = [s.vectorId for s in body.positiveSignals]
        points = qdrant.retrieve(
            collection_name=QDRANT_COLLECTION, ids=vector_ids, with_vectors=True
        )

        if not points:
            log.warning("No vectors found for provided signal IDs")
            return {"songIds": []}

        # 2. Calculate weighted centroid
        # Map ID to its vector for easy access
        id_to_vector = {str(p.id): p.vector for p in points if p.vector is not None}

        centroid = np.zeros(VECTOR_DIM, dtype=np.float32)
        total_weight = 0.0

        for signal in body.positiveSignals:
            vec = id_to_vector.get(signal.vectorId)
            if vec is not None:
                centroid += np.array(vec, dtype=np.float32) * signal.weight
                total_weight += signal.weight

        if total_weight == 0:
            return {"songIds": []}

        centroid /= total_weight
        # Re-normalize
        norm = np.linalg.norm(centroid)
        if norm > 0:
            centroid /= norm

        # 3. Perform search using the weighted centroid
        must_not_filter = None
        if body.excludeSongIds:
            must_not_filter = Filter(
                must_not=[
                    FieldCondition(
                        key="songId",
                        match=MatchAny(any=body.excludeSongIds),
                    )
                ]
            )

        log.info(
            f"REST /recommend: Calculating weighted centroid from {len(body.positiveSignals)} signals"
        )

        results = qdrant.query_points(
            collection_name=QDRANT_COLLECTION,
            query=centroid.tolist(),
            limit=body.limit,
            query_filter=must_not_filter,
            with_payload=["songId"],
        ).points

        song_ids = [
            str(p.payload.get("songId"))
            for p in results
            if p.payload and p.payload.get("songId") is not None
        ]
        log.info(f"REST /recommend result: {song_ids}")
        return {"songIds": song_ids}

    except Exception as e:
        log.error(f"❌ /recommend error: {e}")
        log.error(traceback.format_exc())
        return {"songIds": []}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
