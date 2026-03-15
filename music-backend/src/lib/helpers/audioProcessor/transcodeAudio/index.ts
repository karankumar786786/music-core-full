import { transcodeToHlsMultiQuality } from "./transcodeAudio";
import { createMasterPlaylist } from "./generateMaster.m3u8";
import { Logger } from "@nestjs/common";

const logger = new Logger('processAudioTranscoding');

/**
 * Orchestrates transcoding the given audio file and creating the master playlist.
 *
 * @param inputAudio - Path to the input audio file
 * @param outputDir - Directory to store the output (e.g., /processing/audiofilename/)
 */
export async function processAudioTranscoding(inputAudio: string, outputDir: string): Promise<void> {
    logger.log(`--- Starting Audio Transcoding Process ---`);
    logger.log(`Input audio: ${inputAudio}`);
    logger.log(`Output directory: ${outputDir}`);

    // Call transcoding logic
    await transcodeToHlsMultiQuality(inputAudio, outputDir);

    // Call master playlist generation
    createMasterPlaylist(outputDir);

    logger.log(`--- Audio Transcoding Process Completed Successfully ---`);
    logger.log(`Outputs located in: ${outputDir}`);
}


