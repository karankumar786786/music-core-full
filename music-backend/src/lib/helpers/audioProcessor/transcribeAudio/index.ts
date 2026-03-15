import * as path from "node:path";
import * as fs from "node:fs";
import { Logger } from "@nestjs/common";

import { generateTranscribe } from "./generateTranscribe";
import { generateVtt } from "./generate.vtt";

const logger = new Logger('transcribeAudio');

/**
 * Orchestrates the full process of transcribing an audio file and generating a VTT subtitle file.
 *
 * @param audioFilePath - Absolute or relative path to the input audio file.
 * @param outputDir - The directory where the resulting JSON and VTT files will be saved.
 * @param baseName - Optional base name for the output files (defaults to the audio file's name without extension).
 * @returns Object containing the paths to the generated JSON and VTT files.
 */
export async function processAudioTranscription(
    audioFilePath: string,
    outputDir: string,
    baseName?: string
): Promise<{ jsonPath: string; vttPath: string }> {

    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Determine the base name for the output files (defaults to 'caption')
    const name = baseName || "caption";

    const jsonPath = path.join(outputDir, `${name}.json`);
    const vttPath = path.join(outputDir, `${name}.vtt`);

    logger.log(`--- Starting Audio Transcription Process ---`);
    logger.log(`Input audio: ${audioFilePath}`);
    logger.log(`Output directory: ${outputDir}`);

    // Step 1: Transcribe audio to JSON using Sarvam AI
    logger.log(`[1/2] Generating transcription (JSON)...`);
    await generateTranscribe(audioFilePath, jsonPath);

    // Step 2: Convert the generated JSON transcript to WebVTT format
    logger.log(`[2/2] Generating WebVTT subtitles...`);
    await generateVtt(jsonPath, vttPath);

    logger.log(`--- Transcription Process Completed Successfully ---`);
    logger.log(`JSON Transcript: ${jsonPath}`);
    logger.log(`VTT Subtitles:   ${vttPath}`);

    return {
        jsonPath,
        vttPath
    };
}

