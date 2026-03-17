import * as path from "node:path";
import * as fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Logger } from "@nestjs/common";

const logger = new Logger('transcodeAudio');

const execFileAsync = promisify(execFile);

export interface QualityProfile {
    bitrate: string;
    bandwidth: number;
}

export const QUALITY_PROFILES: QualityProfile[] = [
    { bitrate: "32k", bandwidth: 32000 },
    { bitrate: "64k", bandwidth: 64000 },
    { bitrate: "128k", bandwidth: 128000 },
];

/**
 * Gets the audio duration (in seconds) using ffprobe.
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
    try {
        const { stdout } = await execFileAsync("ffprobe", [
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            audioPath
        ]);

        const data = JSON.parse(stdout);
        const formatInfo = data.format || {};
        const duration = parseFloat(formatInfo.duration || "0");
        return duration;
    } catch (error) {
        logger.error(`Failed to get audio info for ${audioPath}`, error instanceof Error ? error.stack : error);
        return 0;
    }
}

/**
 * Transcodes standard audio to HLS with multiple quality variants.
 * It will create 32k, 64k, 128k directories inside outputDir and place TS segments
 * and a playlist.m3u8 inside each.
 */
export async function transcodeToHlsMultiQuality(inputAudio: string, outputDir: string): Promise<void> {
    logger.log(`🎬 Transcoding to HLS (multi-quality)...`);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const duration = await getAudioDuration(inputAudio);
    if (duration <= 0) {
        throw new Error("Invalid audio duration, cannot transcode");
    }

    const segmentTime = 4;
    logger.log(`📏 Audio duration: ${duration.toFixed(2)}s, using ${segmentTime}s segments`);

    // Transcode each quality variant
    for (const profile of QUALITY_PROFILES) {
        const bitrate = profile.bitrate;
        const qualityDir = path.join(outputDir, bitrate);

        if (!fs.existsSync(qualityDir)) {
            fs.mkdirSync(qualityDir, { recursive: true });
        }

        logger.log(`   🔄 Encoding ${bitrate}...`);

        const playlistPath = path.join(qualityDir, "playlist.m3u8");
        const segmentPattern = path.join(qualityDir, `${bitrate.replace('k', '')}k_%03d.ts`);

        const cmdArgs = [
            "-y",
            "-loglevel", "warning",
            "-i", inputAudio,
            "-vn", // Explicitly no video
            "-c:a", "aac",
            "-b:a", bitrate,
            "-ar", "44100",
            "-ac", "2",
            // Use segment muxer for time-based splitting
            "-f", "segment",
            "-segment_time", segmentTime.toString(),
            "-segment_list", playlistPath,
            "-segment_list_type", "hls",
            "-segment_format", "mpegts",
            "-break_non_keyframes", "1", // Allow breaking anywhere (for audio)
            "-reset_timestamps", "1",    // Reset timestamps per segment
            segmentPattern
        ];

        try {
            await execFileAsync("ffmpeg", cmdArgs);
            logger.log(`   ✅ Encoding completed for ${bitrate}`);
        } catch (error: any) {
            logger.error(`   ❌ Encoding failed for ${bitrate}`, error.message || error);
            throw error;
        }
    }

    logger.log("✅ All qualities transcoded");
}
