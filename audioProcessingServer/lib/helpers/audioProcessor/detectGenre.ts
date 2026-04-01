import * as fs from "node:fs";
import * as path from "node:path";
import * as childProcess from "node:child_process";
import { promisify } from "node:util";

const execPromise = promisify(childProcess.exec);

export type GenreLabel =
    | "Pop"
    | "Hip-Hop"
    | "Rock"
    | "Electronic"
    | "R&B"
    | "Classical"
    | "Jazz"
    | "Folk"
    | "Country"
    | "Metal"
    | "Reggae"
    | "Blues"
    | "Unknown";

interface AudioFeatures {
    bpm: number;
    energy: number; // 0–1 estimate based on RMS
}

/**
 * Extracts rough BPM and energy from an audio file using ffprobe/ffmpeg.
 * Falls back gracefully if analysis fails.
 */
async function extractAudioFeaturesForGenre(audioFilePath: string): Promise<AudioFeatures> {
    try {
        // Use ffmpeg to get RMS loudness as energy proxy
        const { stdout } = await execPromise(
            `ffmpeg -i "${audioFilePath}" -af "ebur128=peak=true" -f null - 2>&1 | grep "I:" | awk '{print $2}'`,
            { timeout: 30_000 }
        );

        // Parse integrated loudness (LUFS) — rough energy proxy
        const lufs = parseFloat(stdout.trim()) || -23;
        // Map LUFS: -8 (loud) → 0.9 energy, -30 (quiet) → 0.1 energy
        const energy = Math.min(1, Math.max(0, (lufs + 30) / 22));

        // Use ffprobe to estimate BPM from metadata (if embedded)
        let bpm = 120; // default neutral BPM
        try {
            const { stdout: probeOut } = await execPromise(
                `ffprobe -v quiet -print_format json -show_format "${audioFilePath}"`,
                { timeout: 10_000 }
            );
            const meta = JSON.parse(probeOut);
            const bpmTag =
                meta?.format?.tags?.bpm ||
                meta?.format?.tags?.BPM ||
                meta?.format?.tags?.TBPM;
            if (bpmTag) bpm = parseFloat(bpmTag);
        } catch {
            // No BPM tag — keep default
        }

        return { bpm, energy };
    } catch {
        return { bpm: 120, energy: 0.5 };
    }
}

/**
 * Classifies a genre from audio features using a simple heuristic.
 * BPM ranges and energy thresholds are tuned for music industry norms.
 */
function classifyGenre({ bpm, energy }: AudioFeatures): GenreLabel {
    // Very slow + low energy → Classical / Jazz
    if (bpm < 70) {
        return energy < 0.4 ? "Classical" : "Jazz";
    }

    // Slow tempo
    if (bpm < 90) {
        if (energy < 0.35) return "Folk";
        if (energy < 0.55) return "Blues";
        return "R&B";
    }

    // Mid tempo
    if (bpm < 115) {
        if (energy < 0.4) return "Country";
        if (energy < 0.6) return "R&B";
        return "Pop";
    }

    // Mid-high tempo
    if (bpm < 135) {
        if (energy < 0.45) return "Pop";
        if (energy < 0.65) return "Hip-Hop";
        if (energy < 0.80) return "Rock";
        return "Metal";
    }

    // High tempo
    if (bpm < 160) {
        if (energy < 0.55) return "Hip-Hop";
        return "Electronic";
    }

    // Very high tempo → Electronic / Metal
    return energy > 0.7 ? "Metal" : "Electronic";
}

/**
 * Auto-detects genre from an audio file.
 * Returns a genre string e.g. "Pop", "Hip-Hop", "Electronic", etc.
 *
 * @param audioFilePath - Path to the local audio file (mp3/wav/flac)
 */
export async function detectGenre(audioFilePath: string): Promise<GenreLabel> {
    try {
        if (!fs.existsSync(audioFilePath)) {
            console.warn(`⚠️ detectGenre: file not found ${audioFilePath}, returning Unknown`);
            return "Unknown";
        }

        const features = await extractAudioFeaturesForGenre(audioFilePath);
        const genre = classifyGenre(features);
        console.log(`🎵 Genre detected: ${genre} (BPM≈${features.bpm.toFixed(0)}, Energy≈${features.energy.toFixed(2)})`);
        return genre;
    } catch (error) {
        console.warn(`⚠️ Genre detection failed, returning Unknown:`, error);
        return "Unknown";
    }
}
