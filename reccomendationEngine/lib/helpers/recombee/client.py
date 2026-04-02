import logging
from recombee_api_client.api_client import RecombeeClient
from recombee_api_client.api_requests import SetItemValues, AddItemProperty
from lib.helpers.config import RECOMBEE_DB_ID, RECOMBEE_PRIVATE_TOKEN

log = logging.getLogger("embedderserver")

_recombee_client = None

def get_recombee_client():
    global _recombee_client
    if _recombee_client is None:
        _recombee_client = RecombeeClient(RECOMBEE_DB_ID, RECOMBEE_PRIVATE_TOKEN)
    return _recombee_client

def ensure_item_properties():
    client = get_recombee_client()
    properties = [
        ("title", "string"),
        ("artistName", "string"),
        ("genre", "string"),
        ("bpm", "double"),
        ("energy", "double"),
        ("danceability", "double"),
        ("key", "double"),
        ("scale", "double"),
        ("loudness", "double"),
        ("spectral_centroid", "double"),
        ("ro_vals", "double"),
        ("mfcc_1", "double"),
        ("mfcc_2", "double"),
        ("mfcc_3", "double"),
        ("mfcc_4", "double"),
        ("mfcc_5", "double"),
        ("mfcc_6", "double"),
        ("mfcc_7", "double"),
        ("mfcc_8", "double"),
        ("mfcc_9", "double"),
        ("mfcc_10", "double"),
        ("mfcc_11", "double"),
        ("mfcc_12", "double"),
        ("mfcc_13", "double"),
    ]
    
    for prop_name, prop_type in properties:
        try:
            client.send(AddItemProperty(prop_name, prop_type))
            log.info(f"Added Recombee property: {prop_name} ({prop_type})")
        except Exception as e:
            # Property might already exist
            log.debug(f"Recombee property {prop_name} might already exist: {e}")

def set_song_properties(song_id: str, properties: dict):
    client = get_recombee_client()
    try:
        client.send(SetItemValues(song_id, properties, cascade_create=True))
        log.info(f"Successfully set Recombee properties for song {song_id}")
    except Exception as e:
        log.error(f"Failed to set Recombee properties for song {song_id}: {e}")
        raise e
