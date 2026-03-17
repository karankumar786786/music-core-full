import numpy as np
import essentia.standard as es
from lib.helpers.config import VECTOR_DIM


def extract_audio_features(audio_path: str) -> list:
    """
    Extracts audio features using Essentia and returns a normalized vector.
    """
    # Decode MP3 → raw mono signal at 44100 Hz
    audio = es.MonoLoader(filename=audio_path, sampleRate=44100)()

    # BPM & rhythm
    bpm, _, beat_conf, _, _ = es.RhythmExtractor2013(method="multifeature")(audio)
    norm_bpm = float(bpm) / 250.0
    beat_conf = float(beat_conf)

    # Key & scale
    key_str, scale_str, key_conf = es.KeyExtractor()(audio)
    KEY_MAP = {
        "C": 0,
        "C#": 1,
        "D": 2,
        "D#": 3,
        "E": 4,
        "F": 5,
        "F#": 6,
        "G": 7,
        "G#": 8,
        "A": 9,
        "A#": 10,
        "B": 11,
    }
    norm_key = KEY_MAP.get(key_str, 0) / 11.0
    scale_bin = 1.0 if scale_str == "major" else 0.0
    key_conf = float(key_conf)

    # Loudness & energy
    loudness = abs(float(es.Loudness()(audio))) / 60.0
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
    norm_sc = float(np.mean(sc_vals)) / 10000.0
    norm_ro = float(np.mean(ro_vals)) / 22050.0

    # 23-value feature array
    features = [
        norm_bpm,
        beat_conf,
        norm_key,
        scale_bin,
        key_conf,
        loudness,
        energy,
        danceability,
        norm_sc,
        norm_ro,
    ] + mfcc_mean  # total: 23

    # Pad to VECTOR_DIM
    features += [0.0] * (VECTOR_DIM - len(features))

    # L2 normalise
    arr = np.array(features, dtype=np.float32)
    norm = np.linalg.norm(arr)
    return (arr / norm if norm > 0 else arr).tolist()
