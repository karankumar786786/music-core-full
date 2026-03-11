import logging
import random
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

# Minimum cosine similarity score to include in results
SCORE_THRESHOLD = 0.3


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
    Uses native Qdrant Point ID queries from sampled valid signals.
    Over-fetches slightly for diversity, filters by score threshold, then returns
    top half deterministically + shuffled bottom half.
    """
    if not body.positiveSignals:
        return {"songIds": []}

    try:
        qdrant = get_qdrant_client()
        from lib.helpers.config import QDRANT_COLLECTION

        valid_signals = body.positiveSignals

        # 1. Pick up to 3 "seed" tracks randomly, proportionally by weight
        num_seeds = min(3, len(valid_signals))
        weights = [s.weight for s in valid_signals]
        total_w = sum(weights)
        if total_w > 0:
            probs = [w / total_w for w in weights]
        else:
            probs = [1.0 / len(valid_signals)] * len(valid_signals)

        selected_indices = np.random.choice(
            len(valid_signals), size=num_seeds, replace=False, p=probs
        )

        seeds = [valid_signals[i] for i in selected_indices]

        # 2. Build exclusion filter
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

        # 3. Run separate queries for each seed to ensure diversity
        queries_results = []
        limit_per_seed = (body.limit // num_seeds) + 2
        log.info(
            f"REST /recommend: Using {num_seeds} sampled seeds for multi-query interleaving"
        )

        for sig in seeds:
            try:
                # Query Qdrant for this specific seed using its ID
                res = qdrant.query_points(
                    collection_name=QDRANT_COLLECTION,
                    query=sig.vectorId,
                    limit=limit_per_seed,
                    query_filter=must_not_filter,
                    with_payload=["songId"],
                    score_threshold=SCORE_THRESHOLD,
                ).points
                if res:
                    queries_results.append(res)
            except Exception as e:
                log.warning(f"Qdrant query_points failed for seed {sig.vectorId}: {e}")
                continue

        if not queries_results:
            return {"songIds": []}

        # 4. Interleave results round-robin (A1, B1, C1, A2, B2, C2...)
        interleaved = []
        max_len = max(len(qr) for qr in queries_results)

        for i in range(max_len):
            for qr in queries_results:
                if i < len(qr):
                    interleaved.append(qr[i])

        # Remove duplicates while preserving order
        seen = set()
        final_results = []
        for p in interleaved:
            if p.id not in seen:
                seen.add(p.id)
                final_results.append(p)

        # 5. Light diversity: top 70% deterministic, only bottom 30% shuffled
        mid = int(body.limit * 0.7)
        top_half = final_results[:mid]
        bottom_pool = final_results[mid:]
        if bottom_pool:
            random.shuffle(bottom_pool)

        shuffled_results = top_half + bottom_pool
        shuffled_results = shuffled_results[: body.limit]

        song_ids = [
            str(p.payload.get("songId"))
            for p in shuffled_results
            if p.payload and p.payload.get("songId") is not None
        ]
        log.info(
            f"REST /recommend result: {len(song_ids)} songs (from {len(final_results)} interleaved candidates)"
        )
        return {"songIds": song_ids}

    except Exception as e:
        log.error(f"❌ /recommend error: {e}")
        log.error(traceback.format_exc())
        return {"songIds": []}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
