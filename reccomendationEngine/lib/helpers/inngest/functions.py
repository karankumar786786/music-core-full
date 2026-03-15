import logging
import traceback
import inngest
from qdrant_client.models import (
    Filter,
    FieldCondition,
    MatchAny,
)
from lib.helpers.inngest.client import inngest_client
from lib.helpers.storage.s3 import download_audio, download_caption_as_dict
from lib.helpers.embeddings.models import (
    extract_lyrics_text,
    generate_lyrics_vector,
    generate_metadata_vector,
    combine_vectors,
)
from lib.helpers.audio_processing.audio import extract_audio_features
from lib.helpers.qdrant.client import upsert_qdrant, get_qdrant_client
from lib.helpers.config import QDRANT_COLLECTION

log = logging.getLogger("embedderserver")


@inngest_client.create_function(
    fn_id="generate-vector-embeddings",
    trigger=inngest.TriggerEvent(event="vector-embedding-job"),
    retries=3,
)
async def generate_embeddings_fn(
    ctx: inngest.Context,
) -> dict:
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
            lambda: download_audio(processed_key),
        )

        # ── Step 2: Download caption.json from S3 ────────────────────────────────
        caption_data = await ctx.step.run(
            "download-caption",
            lambda: download_caption_as_dict(processed_key),
        )

        # ── Step 3: Extract clean lyrics text ────────────────────────────────────
        lyrics_text = await ctx.step.run(
            "extract-lyrics-text",
            lambda: extract_lyrics_text(caption_data),
        )

        # ── Step 4: Generate lyrics vector ───────────────────────────────────────
        lyrics_vec = await ctx.step.run(
            "generate-lyrics-vector",
            lambda: generate_lyrics_vector(lyrics_text),
        )

        # ── Step 5: Generate metadata vector ─────────────────────────────────────
        meta_vec = await ctx.step.run(
            "generate-metadata-vector",
            lambda: generate_metadata_vector(title, artist_name, genre),
        )

        # ── Step 6: Generate audio feature vector ────────────────────────────────
        audio_vec = await ctx.step.run(
            "generate-audio-vector",
            lambda: extract_audio_features(audio_path),
        )

        # ── Step 7: Weighted combination ─────────────────────────────────────────
        final_vec = await ctx.step.run(
            "combine-vectors",
            lambda: combine_vectors(lyrics_vec, audio_vec, meta_vec),
        )

        # ── Step 8: Upsert into Qdrant ───────────────────────────────────────────
        qdrant_point_id = await ctx.step.run(
            "upsert-qdrant",
            lambda: upsert_qdrant(
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
        qdrant = get_qdrant_client()
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


functions = [generate_embeddings_fn, generate_user_feed_fn]
