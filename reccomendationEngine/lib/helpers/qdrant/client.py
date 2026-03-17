import logging
from typing import Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from lib.helpers.config import (
    QDRANT_ENDPOINT,
    QDRANT_API_KEY,
    QDRANT_COLLECTION,
    VECTOR_DIM,
)

log = logging.getLogger("embedderserver")

_qdrant_client: Optional[QdrantClient] = None


def get_qdrant_client():
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(url=QDRANT_ENDPOINT, api_key=QDRANT_API_KEY)
    return _qdrant_client


def ensure_collection():
    client = get_qdrant_client()
    existing = [c.name for c in client.get_collections().collections]
    if QDRANT_COLLECTION not in existing:
        log.info(f"Creating Qdrant collection '{QDRANT_COLLECTION}' ...")
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )
        log.info("Collection created")

    # Ensure payload index for filtering
    log.info(f"Ensuring payload index for 'songId' in '{QDRANT_COLLECTION}'")
    client.create_payload_index(
        collection_name=QDRANT_COLLECTION,
        field_name="songId",
        field_schema="keyword",
    )


def upsert_qdrant(
    vector_id: str,
    final_vec: list,
    lyrics_vec: list,
    audio_vec: list,
    meta_vec: list,
    payload: dict,
) -> str:
    client = get_qdrant_client()
    result = client.upsert(
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
