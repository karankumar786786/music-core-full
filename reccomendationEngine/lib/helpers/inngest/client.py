import os
import inngest
from lib.helpers.config import INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY

inngest_client = inngest.Inngest(
    app_id="embedderserver",
    event_key=INNGEST_EVENT_KEY,
    signing_key=INNGEST_SIGNING_KEY,
    is_production=os.environ.get("NODE_ENV") == "production",
)
