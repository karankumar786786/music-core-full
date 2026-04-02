import json
import logging
import os
import tempfile
from typing import Any, Optional
import boto3
AWS_TEMP_BUCKET = os.environ.get("AWS_TEMP_BUCKET", "onemelodytemp")

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


def download_audio(key: str, bucket: str = AWS_TEMP_BUCKET) -> str:
    """
    Downloads audio from S3 to a temp file and returns the local path.
    """
    s3 = get_s3_client()
    # Create temp file with .mp3 extension
    fd, tmp_path = tempfile.mkstemp(suffix=".mp3")
    os.close(fd)
    
    try:
        log.info(f"Downloading s3://{bucket}/{key}")
        s3.download_file(bucket, key, tmp_path)
        log.info("Audio downloaded")
        return tmp_path
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        log.error(f"Failed to download audio from s3://{bucket}/{key}: {e}")
        raise e


def delete_s3_object(key: str, bucket: str = AWS_TEMP_BUCKET):
    """
    Deletes an object from S3.
    """
    s3 = get_s3_client()
    try:
        log.info(f"Deleting s3://{bucket}/{key}")
        s3.delete_object(Bucket=bucket, Key=key)
        log.info("S3 object deleted")
    except Exception as e:
        log.error(f"Failed to delete s3://{bucket}/{key}: {e}")
