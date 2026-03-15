from pydantic import BaseModel
from typing import List, Optional


class WeightedSignal(BaseModel):
    vectorId: str
    weight: float


class RecommendRequest(BaseModel):
    positiveSignals: List[WeightedSignal]
    excludeSongIds: List[str] = []
    limit: int = 15
