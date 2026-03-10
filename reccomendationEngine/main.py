import logging
import traceback
import numpy as np
import inngest.fast_api
from fastapi import FastAPI
from contextlib import asynccontextmanager

from lib.helpers.config import log, VECTOR_DIM
from lib.helpers.embeddings.models import get_lyrics_model, get_meta_model
from lib.helpers.qdrant.client import get_qdrant_client, ensure_collection
from lib.helpers.storage.s3 import get_s3_client
from lib.helpers.inngest import client as inngest_client, functions as inngest_functions
from lib.dtos.recommendation import RecommendRequest
from qdrant_client.models import (
    Filter,
    FieldCondition,
    MatchAny,
)


# ─── Startup ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up embedderserver...")

    # Initialize models
    get_lyrics_model()
    get_meta_model()

    # Initialize Qdrant and ensure collection
    ensure_collection()

    # Initialize S3
    get_s3_client()

    log.info("embedderserver ready")
    yield
    log.info("embedderserver shutting down ...")


app = FastAPI(title="embedderserver", lifespan=lifespan)

# ── Register Inngest functions with FastAPI ───────────────────────────────────
inngest.fast_api.serve(
    app,
    inngest_client,
    inngest_functions,
    serve_path="/api/inngest",
)


@app.post("/recommend")
async def recommend_endpoint(body: RecommendRequest):
    """
    Direct REST endpoint for NestJS to call.
    Calculates weighted centroid from positive signals and searches Qdrant.
    """
    if not body.positiveSignals:
        return {"songIds": []}

    try:
        qdrant = get_qdrant_client()
        from lib.helpers.config import QDRANT_COLLECTION

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
