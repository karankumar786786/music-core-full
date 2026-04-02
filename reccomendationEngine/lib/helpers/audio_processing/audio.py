import numpy as np
import essentia.standard as es
from lib.helpers.config import VECTOR_DIM


def extract_audio_features(audio_path: str) -> dict:
    """
    Extracts audio features using Essentia and returns a dictionary of features.
    """
    # Decode MP3 → raw mono signal at 44100 Hz
    audio = es.MonoLoader(filename=audio_path, sampleRate=44100)()

    # BPM & rhythm
    bpm, _, beat_conf, _, _ = es.RhythmExtractor2013(method="multifeature")(audio)
    
    # Key & scale
    key_str, scale_str, key_conf = es.KeyExtractor()(audio)
    
    # Loudness & energy
    loudness = float(es.Loudness()(audio))
    energy = float(es.Energy()(audio))

    # Danceability
    danceability = float(es.Danceability()(audio)[0])

    # MFCC + spectral across all frames
    w_algo = es.Windowing(type="hann")
    spec_algo = es.Spectrum()
    mfcc_algo = es.MFCC(numberCoefficients=13)
    sc_algo = es.SpectralCentroidTime()
    ro_algo = es.RollOff()

    mfcc_frames, sc_vals, ro_vals = [], [], []
    for frame in es.FrameGenerator(audio, frameSize=2048, hopSize=512):
        windowed = w_algo(frame)
        spectrum = spec_algo(windowed)
        _, coeffs = mfcc_algo(spectrum)
        mfcc_frames.append(coeffs)
        sc_vals.append(sc_algo(frame))
        ro_vals.append(ro_algo(spectrum))

    mfcc_mean = np.mean(mfcc_frames, axis=0).tolist()  # 13 values
    avg_sc = float(np.mean(sc_vals))
    avg_ro = float(np.mean(ro_vals))

    # Construct feature dictionary
    features = {
        "bpm": float(bpm),
        "energy": energy,
        "danceability": danceability,
        "loudness": loudness,
        "key": float(key_conf), # Using confidence as a proxy or just the key index if needed
        "scale": 1.0 if scale_str == "major" else 0.0,
        "spectral_centroid": avg_sc,
        "ro_vals": avg_ro,
    }
    
    # Add MFCCs
    for i, val in enumerate(mfcc_mean):
        features[f"mfcc_{i+1}"] = float(val)

    return features

def detect_genre(features: dict) -> str:
    """
    Heuristic genre detection based on Essentia features.
    """
    bpm = features.get("bpm", 120)
    energy = features.get("energy", 0.5)
    danceability = features.get("danceability", 0.5)
    
    # Very slow + low energy → Classical / Jazz
    if bpm < 70:
        return "Classical" if energy < 0.4 else "Jazz"

    # Slow tempo
    if bpm < 90:
        if energy < 0.35: return "Folk"
        if energy < 0.55: return "Blues"
        return "R&B"

    # Mid tempo
    if bpm < 115:
        if energy < 0.4: return "Country"
        if energy < 0.6: return "R&B"
        return "Pop"

    # Mid-high tempo
    if bpm < 135:
        if energy < 0.45: return "Pop"
        if danceability > 0.6: return "Hip-Hop"
        if energy > 0.7: return "Rock"
        return "Pop"

    # High tempo
    if bpm < 160:
        if danceability > 0.6: return "Hip-Hop"
        return "Electronic"

    # Very high tempo → Electronic / Metal
    return "Metal" if energy > 0.7 else "Electronic"
