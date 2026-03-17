import json
import logging
import os
import tempfile
from typing import Any, Optional
import boto3
from lib.helpers.config import AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_REGION, AWS_BUCKET

log = logging.getLogger("embedderserver")

_s3_client: Optional[Any] = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
        )
    return _s3_client


def download_audio(processed_key: str) -> str:
    """
    Downloads audio to a temp file and returns the local path.
    Tries original.mp3 first, falls back to audio.mp3.
    """
    s3 = get_s3_client()
    tmp_path = tempfile.mktemp(suffix=".mp3")
    for filename in ("original.mp3", "audio.mp3"):
        key = f"{processed_key}/{filename}"
        try:
            log.info(f"Downloading s3://{AWS_BUCKET}/{key}")
            s3.download_file(AWS_BUCKET, key, tmp_path)
            log.info("Audio downloaded")
            return tmp_path
        except Exception:
            continue
    raise RuntimeError(f"No audio file found under prefix: {processed_key}")


def download_caption_as_dict(processed_key: str) -> dict:
    """
    Downloads caption.json and returns its parsed content as a dict.
    """
    s3 = get_s3_client()
    tmp_path = tempfile.mktemp(suffix=".json")
    key = f"{processed_key}/caption.json"
    log.info(f"Downloading s3://{AWS_BUCKET}/{key}")
    try:
        s3.download_file(AWS_BUCKET, key, tmp_path)
    except Exception as exc:
        raise RuntimeError(f"caption.json not found at {key}: {exc}")

    with open(tmp_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    os.remove(tmp_path)
    return data
