import logging
import numpy as np
from typing import Optional
from sentence_transformers import SentenceTransformer
from lib.helpers.config import VECTOR_DIM

log = logging.getLogger("embedderserver")

_lyrics_model: Optional[SentenceTransformer] = None
_meta_model: Optional[SentenceTransformer] = None


def get_lyrics_model():
    global _lyrics_model
    if _lyrics_model is None:
        log.info("Loading paraphrase-multilingual-MiniLM-L12-v2 ...")
        _lyrics_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    return _lyrics_model


def get_meta_model():
    global _meta_model
    if _meta_model is None:
        log.info("Loading all-MiniLM-L6-v2 ...")
        _meta_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _meta_model


def extract_lyrics_text(caption_data: dict) -> str:
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


def generate_lyrics_vector(text: str) -> list:
    model = get_lyrics_model()
    if not text.strip():
        log.warning("Empty lyrics — using zero vector")
        return [0.0] * VECTOR_DIM

    # Truncate to ~400 words to stay under 512 token model limit
    words = text.split()
    if len(words) > 400:
        text = " ".join(words[:400])

    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


def generate_metadata_vector(title: str, artist: str, genre: str) -> list:
    model = get_meta_model()
    sentence = f"Song: {title}. Artist: {artist}. Genre: {genre}."
    vec = model.encode(sentence, normalize_embeddings=True)
    return vec.tolist()


def combine_vectors(lyrics_vec: list, audio_vec: list, meta_vec: list) -> list:
    combined = (
        np.array(lyrics_vec, dtype=np.float32) * 0.40
        + np.array(audio_vec, dtype=np.float32) * 0.45
        + np.array(meta_vec, dtype=np.float32) * 0.15
    )
    norm = np.linalg.norm(combined)
    return (combined / norm if norm > 0 else combined).tolist()
