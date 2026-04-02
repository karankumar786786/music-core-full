import * as path from "node:path";
import * as fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Normalizes an audio file using ffmpeg loudnorm filter (EBU R128).
 * Performs a two-pass normalization for better results.
 * 
 * @param inputAudio - Path to the original input audio file.
 * @param outputDir - Directory to save the normalized audio.
 * @returns Path to the normalized audio file.
 */
export async function normalizeAudio(inputAudio: string, outputDir: string): Promise<string> {
    console.log(`\n--- Starting Audio Normalization Process ---`);
    console.log(`Input audio: ${inputAudio}`);
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const baseName = path.basename(inputAudio);
    const extName = path.extname(baseName);
    const nameWithoutExt = path.basename(baseName, extName);
    const normalizedOutputPath = path.join(outputDir, `${nameWithoutExt}_normalized${extName}`);

    // Pass 1: Measure
    console.log(`   [1/2] Measuring loudness...`);
    let loudnormParams = "";
    
    try {
        const { stderr } = await execFileAsync("ffmpeg", [
            "-i", inputAudio,
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
            "-f", "null",
            "-"
        ]);
        
        const match = stderr.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
        if (match) {
            const loudnormData = JSON.parse(match[0]);
            
            loudnormParams = [
                `I=-14`,
                `TP=-1.5`,
                `LRA=11`,
                `measured_I=${loudnormData.input_i}`,
                `measured_TP=${loudnormData.input_tp}`,
                `measured_LRA=${loudnormData.input_lra}`,
                `measured_thresh=${loudnormData.input_thresh}`,
                `offset=${loudnormData.target_offset}`
            ].join(":");
        } else {
            loudnormParams = "I=-14:TP=-1.5:LRA=11";
        }
    } catch (err: any) {
        console.warn("Measurement pass failed or stderr parsing failed. Proceeding with single-pass normalization.", err.message);
        loudnormParams = "I=-14:TP=-1.5:LRA=11";
    }

    // Pass 2: Apply
    console.log(`   [2/2] Applying loudness normalization...`);
    try {
        await execFileAsync("ffmpeg", [
            "-y",
            "-i", inputAudio,
            "-af", `loudnorm=${loudnormParams}`,
            "-ar", "44100",
            normalizedOutputPath
        ]);
        console.log(`✅ Normalization complete: ${normalizedOutputPath}`);
    } catch (err: any) {
        console.error(`❌ Normalization failed:`, err.message);
        throw err;
    }

    return normalizedOutputPath;
}
