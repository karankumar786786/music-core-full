import os
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("embedderserver")

# Config from env
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
