import os
import logging
import traceback
import inngest
from lib.helpers.inngest.client import inngest_client
from lib.helpers.storage.s3 import download_audio, delete_s3_object
from lib.helpers.audio_processing.audio import extract_audio_features, detect_genre
from lib.helpers.recombee.client import set_song_properties

log = logging.getLogger("embedderserver")


@inngest_client.create_function(
    fn_id="process-song-features",
    trigger=inngest.TriggerEvent(event="process-song-features"),
    retries=3,
)
async def process_song_features_fn(
    ctx: inngest.Context,
) -> dict:
    data = ctx.event.data
    job_id = data["jobId"]
    song_id = data["songId"]
    temp_song_key = data["tempSongKey"]
    title = data["title"]
    artist_name = data["artistName"]

    log.info(f"Starting feature extraction job={job_id} song={song_id}")

    local_audio_path = None
    try:
        # ── Step 1: Download audio from temp S3 ──────────────────────────────────
        local_audio_path = await ctx.step.run(
            "download-audio",
            lambda: download_audio(temp_song_key),
        )

        # ── Step 2: Extract audio features with Essentia ─────────────────────────
        features = await ctx.step.run(
            "extract-audio-features",
            lambda: extract_audio_features(local_audio_path),
        )

        # ── Step 3: Detect genre ─────────────────────────────────────────────────
        genre = await ctx.step.run(
            "detect-genre",
            lambda: detect_genre(features),
        )
        
        # ── Step 4: Sync to Recombee ─────────────────────────────────────────────
        recombee_props = {
            "title": title,
            "artistName": artist_name,
            "genre": genre,
            **features
        }
        
        await ctx.step.run(
            "sync-recombee",
            lambda: set_song_properties(song_id, recombee_props),
        )

        # ── Step 5: Cleanup temp S3 audio ────────────────────────────────────────
        await ctx.step.run(
            "cleanup-s3",
            lambda: delete_s3_object(temp_song_key),
        )

        # ── Step 6: Fire completion event ────────────────────────────────────────
        await ctx.step.send_event(
            "trigger-set-recombee-flags",
            inngest.Event(
                name="recombee-sync-completed",
                data={
                    "jobId": job_id,
                    "genre": genre,
                },
            ),
        )

        log.info(f"Feature processing done for song={song_id}, genre={genre}")
        return {
            "success": True,
            "songId": song_id,
            "genre": genre,
        }
    except Exception as e:
        log.error(f"❌ Error in process_song_features_fn: {str(e)}")
        log.error(traceback.format_exc())
        raise e
    finally:
        # Cleanup local file
        if local_audio_path and os.path.exists(local_audio_path):
            os.remove(local_audio_path)
            log.info(f"Cleaned up local file: {local_audio_path}")


functions = [process_song_features_fn]
