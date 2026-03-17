import asyncio
import httpx
from lib.dtos.recommendation import RecommendRequest, WeightedSignal
from main import app


async def test_endpoint():
    print("Testing /recommend endpoint locally")

    # Example mock payload
    payload = {
        "positiveSignals": [
            {"vectorId": "123e4567-e89b-12d3-a456-426614174000", "weight": 2.0},
            {"vectorId": "123e4567-e89b-12d3-a456-426614174001", "weight": 1.0},
        ],
        "excludeSongIds": [],
        "limit": 10,
    }

    import httpx

    # Start httpx async client
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/recommend", json=payload)

        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")


if __name__ == "__main__":
    asyncio.run(test_endpoint())
