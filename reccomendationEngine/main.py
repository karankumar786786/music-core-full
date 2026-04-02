import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
import inngest.fast_api
from lib.helpers.inngest.client import inngest_client
from lib.helpers.inngest.functions import functions
from lib.helpers.recombee.client import ensure_item_properties

log = logging.getLogger("embedderserver")

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up processor server...")
    # Startup: Ensure Recombee properties exist
    ensure_item_properties()
    yield
    log.info("Processor server shutting down ...")


app = FastAPI(title="processor-server", lifespan=lifespan)

@app.get("/")
def read_root():
    return {"message": "Audio Processor (Essentia + Recombee) is running"}

# Register Inngest functions with FastAPI
inngest.fast_api.serve(
    app,
    inngest_client,
    functions,
    serve_path="/api/inngest",
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
