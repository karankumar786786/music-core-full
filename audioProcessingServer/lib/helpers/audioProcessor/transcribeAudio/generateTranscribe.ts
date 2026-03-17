import { SarvamAIClient } from "sarvamai";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * Generates transcription for a given audio file and saves it to a specified JSON file path.
 *
 * @param audioFilePath - Absolute or relative path to the input audio file.
 * @param outputJsonFilePath - Absolute or relative path where the final JSON transcription should be saved.
 */
export async function generateTranscribe(audioFilePath: string, outputJsonFilePath: string): Promise<void> {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
        throw new Error("SARVAM_API_KEY not found in environment variables");
    }

    const client = new SarvamAIClient({
        apiSubscriptionKey: apiKey
    });

    if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    console.log(`Processing audio file: ${audioFilePath}`);

    // Create batch job
    const job = await client.speechToTextJob.createJob({
        model: "saaras:v3",
        withDiarization: true, // You can make this configurable later if needed
    });

    console.log(`Created job: ${job.jobId}`);

    // Upload and process files
    console.log("Uploading file...");
    await job.uploadFiles([audioFilePath]);

    console.log("Starting job...");
    await job.start();

    // Wait for completion
    console.log("Waiting for job to complete (this may take a few minutes)...");
    await job.waitUntilComplete();

    // Check file-level results
    const fileResults = await job.getFileResults();

    const baseName = path.basename(audioFilePath);

    const failed = fileResults.failed.find(f => f.file_name === baseName);
    if (failed) {
        throw new Error(`Failed to transcribe ${failed.file_name}: ${failed.error_message}`);
    }

    const successful = fileResults.successful.find(f => f.file_name === baseName);
    if (!successful) {
        throw new Error("Job completed but file was not marked as successful or failed.");
    }

    // Download to a temporary directory so we can locate the exact JSON and move it to `outputJsonFilePath`
    const tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), "sarvam-transcribe-"));

    try {
        await job.downloadOutputs(tempOutputDir);

        const downloadedFiles = fs.readdirSync(tempOutputDir);
        const jsonFile = downloadedFiles.find(f => f.endsWith('.json'));

        if (!jsonFile) {
            throw new Error(`No JSON output found in downloaded files. Downloaded: ${downloadedFiles.join(", ")}`);
        }

        const sourceJsonPath = path.join(tempOutputDir, jsonFile);

        // Ensure the target directory exists
        const targetDir = path.dirname(outputJsonFilePath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Copy the JSON to the requested output path
        fs.copyFileSync(sourceJsonPath, outputJsonFilePath);

        console.log(`Transcription successfully saved to: ${outputJsonFilePath}`);
    } finally {
        // Clean up the temporary directory
        fs.rmSync(tempOutputDir, { recursive: true, force: true });
    }
}
