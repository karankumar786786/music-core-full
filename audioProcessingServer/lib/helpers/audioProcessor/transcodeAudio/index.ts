import { transcodeToHlsMultiQuality } from "./transcodeAudio";
import { createMasterPlaylist } from "./generateMaster.m3u8";

/**
 * Orchestrates transcoding the given audio file and creating the master playlist.
 *
 * @param inputAudio - Path to the input audio file
 * @param outputDir - Directory to store the output (e.g., /processing/audiofilename/)
 */
export async function processAudioTranscoding(inputAudio: string, outputDir: string): Promise<void> {
    console.log(`\n--- Starting Audio Transcoding Process ---`);
    console.log(`Input audio: ${inputAudio}`);
    console.log(`Output directory: ${outputDir}`);

    // Call transcoding logic
    await transcodeToHlsMultiQuality(inputAudio, outputDir);

    // Call master playlist generation
    createMasterPlaylist(outputDir);

    console.log(`\n--- Audio Transcoding Process Completed Successfully ---`);
    console.log(`Outputs located in: ${outputDir}\n`);
}


