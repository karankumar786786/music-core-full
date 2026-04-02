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
RECOMBEE_DB_ID = os.environ.get("RECOMBEE_DB_ID", "one-org-one-melody")
RECOMBEE_PRIVATE_TOKEN = os.environ.get("RECOMBEE_PRIVATE_TOKEN", "pN8aXBwXNHjUJyceeab9si9keRB8bDNyYFdrWpqmddXScnoLcG8jGf7r9PkdX1jR")
INNGEST_EVENT_KEY = os.environ.get("INNGEST_EVENT_KEY", "local")
INNGEST_SIGNING_KEY = os.environ.get("INNGEST_SIGNING_KEY", "")

# Validate critical config
if not all([AWS_ACCESS_KEY, AWS_SECRET_KEY, RECOMBEE_PRIVATE_TOKEN]):
    missing = [
        k
        for k, v in {
            "AWS_ACCESS_KEY": AWS_ACCESS_KEY,
            "AWS_SECRET_KEY": AWS_SECRET_KEY,
            "RECOMBEE_PRIVATE_TOKEN": RECOMBEE_PRIVATE_TOKEN,
        }.items()
        if not v
    ]
    log.error(f"Missing critical environment variables: {', '.join(missing)}")

