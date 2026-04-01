import { client } from "../client";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { getPrismaClient } from "../../prisma/getPrismaClient";
import { getObject } from "../../storage/getObject.s3";
import { deleteObject } from "../../storage/deleteObject.s3";
import { putObject } from "../../storage/putObject.s3";
import { uploadImageToImageKit } from "../../imageKit/uploadImage";
import { detectGenre } from "../../audioProcessor/detectGenre";
import { processAudioTranscription } from "../../audioProcessor/transcribeAudio";
import { processAudioTranscoding } from "../../audioProcessor/transcodeAudio";
import { uploadTranscodedAudio } from "../../audioProcessor/uploadTranscodedAudio/uploadTranscodedAudio";
import { cleanupProcessedFolder } from "../../audioProcessor/uploadTranscodedAudio/cleanup";

const prisma = getPrismaClient();

export const audioProcessingFunction = client.createFunction(
    {
        id: "audio-processing-v2",
        name: "Audio Processing",
        retries: 3,
        onFailure: async ({ error, event }: { error: any; event: any }) => {
            const { jobId } = event.data.event.data;
            console.error(`❌ [Job ${jobId}] Audio Processing Pipeline FAILED`, error);
            await prisma.songProcessingJob.update({
                where: { id: jobId },
                data: { currentStatus: "failed" },
            });
        }
    },
    { event: "audio-process-job" },
    async ({ event, step }: { event: any; step: any }) => {
        const { jobId, tempSongKey, tempSongImageKey } = event.data;
        console.log(`📡 [Job ${jobId}] Received audio-process-job event`);

        // Fetch the full job details
        const job = await step.run("fetch-job-details", async () => {
            return await prisma.songProcessingJob.findUnique({
                where: { id: jobId },
            });
        });

        if (!job) {
            throw new Error(`Job ${jobId} not found in database`);
        }

        console.log(`🚀 Starting audio processing pipeline for jobId: ${jobId}`);
        console.log(`   tempSongKey: ${tempSongKey}`);
        console.log(`   tempSongImageKey: ${tempSongImageKey}`);

        // Temporary local directory for all processing of this job
        const localFolderPath = path.join(process.cwd(), "processing", jobId);

        // Helper to update the job status in Prisma
        const updateJobStage = async (stage: string, updates: any) => {
            console.log(`   [Job ${jobId}] Updating stage: ${stage}`, updates);
            return await step.run(`update-status-${stage}`, async () => {
                return await prisma.songProcessingJob.update({
                    where: { id: jobId },
                    data: updates,
                });
            });
        };

        // ── Image Processing via ImageKit ──────────────────────────────────────
        const processImages = async () => {
            console.log(`📸 [Job ${jobId}] Starting image upload to ImageKit`);
            const tempImageDir = path.join(localFolderPath, "imageInput");

            const downloadedImagePath = await step.run("download-temp-image", async () => {
                const success = await getObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempSongImageKey,
                    outputDir: tempImageDir,
                });
                if (!success) {
                    throw new Error(`Failed to download image: ${tempSongImageKey}`);
                }
                return path.join(tempImageDir, path.basename(tempSongImageKey));
            });

            // Upload original image directly to ImageKit — transformations are applied at URL level
            const imageKitResult = await step.run("upload-image-to-imagekit", async () => {
                const result = await uploadImageToImageKit(
                    downloadedImagePath,
                    `songs/cover`,
                    jobId
                );
                // Cleanup local temp image dir
                if (fs.existsSync(tempImageDir)) {
                    fs.rmSync(tempImageDir, { recursive: true, force: true });
                }
                return result;
            });

            await updateJobStage("images-processed", {
                processedImages: true,
                // Store ImageKit filePath as processedKey for images
                // The actual song's storageKey will be set to songS3Prefix later
            });

            // Delete temp image from S3
            await step.run("cleanup-temp-image-s3", async () => {
                await deleteObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempSongImageKey,
                });
                console.log(`🧹 [Job ${jobId}] Deleted temp image from S3: ${tempSongImageKey}`);
            });

            return imageKitResult;
        };

        // ── Audio Processing ───────────────────────────────────────────────────
        const processAudio = async () => {
            console.log(`🎵 [Job ${jobId}] Starting audio processing`);
            const tempAudioDir = path.join(localFolderPath, "audioInput");
            const downloadedAudioPath = await step.run("download-temp-audio", async () => {
                const success = await getObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempSongKey,
                    outputDir: tempAudioDir,
                });
                if (!success) {
                    throw new Error(`Failed to download audio: ${tempSongKey}`);
                }
                return path.join(tempAudioDir, path.basename(tempSongKey));
            });

            const audioOutputDir = path.join(localFolderPath, "audioOutput");

            // ── Genre Auto-Detection ───────────────────────────────────────────
            const detectedGenre = await step.run("detect-genre", async () => {
                const genre = await detectGenre(downloadedAudioPath);
                console.log(`🎵 [Job ${jobId}] Auto-detected genre: ${genre}`);
                await prisma.songProcessingJob.update({
                    where: { id: jobId },
                    data: { genre },
                });
                return genre;
            });

            await step.run("transcribe-audio", async () => {
                await processAudioTranscription(downloadedAudioPath, audioOutputDir);
            });
            await updateJobStage("transcribe-completed", { transcribed: true });

            await step.run("transcode-audio", async () => {
                await processAudioTranscoding(downloadedAudioPath, audioOutputDir);
            });
            await updateJobStage("transcode-completed", { transcoded: true });

            const songS3Prefix = await step.run("upload-audio-to-s3", async () => {
                const prefix = await uploadTranscodedAudio(audioOutputDir, jobId);
                cleanupProcessedFolder(audioOutputDir);
                return prefix;
            });

            // Upload raw audio for Embedder
            await step.run("upload-raw-audio-for-embedder", async () => {
                const rawAudioKey = `${songS3Prefix}/audio.mp3`;
                console.log(`📤 [Job ${jobId}] Uploading raw audio to ${rawAudioKey}`);
                const success = await putObject({
                    bucketName: process.env.AWS_PRODUCTION_BUCKET as string,
                    key: rawAudioKey,
                    body: fs.readFileSync(downloadedAudioPath),
                    contentType: "audio/mpeg",
                });
                if (!success) {
                    throw new Error("Raw audio upload failed");
                }
                cleanupProcessedFolder(tempAudioDir);
            });

            // Delete temp audio from S3
            await step.run("cleanup-temp-audio-s3", async () => {
                await deleteObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempSongKey,
                });
                console.log(`🧹 [Job ${jobId}] Deleted temp audio from S3: ${tempSongKey}`);
            });

            return { songS3Prefix, detectedGenre };
        };

        // ── Execution Flow ─────────────────────────────────────────────────────
        console.log(`⌛ [Job ${jobId}] Running pipelines sequentially...`);

        const vectorId = await step.run("generate-vector-id", async () => {
            return randomUUID();
        });
        await updateJobStage("init-vector-id", { vectorId });

        const imageKitResult = await processImages();
        const { songS3Prefix, detectedGenre } = await processAudio();

        await updateJobStage("pipeline-completed", {
            processedKey: songS3Prefix,
            coverUrl: imageKitResult?.url || null,
        });

        // Trigger the Python Embedder Server
        console.log(`🚀 [Job ${jobId}] Triggering vector-embedding-job`);
        await step.sendEvent("trigger-python-embedder", {
            name: "vector-embedding-job",
            data: {
                jobId,
                songId: job.songId,
                vectorId,
                processedKey: songS3Prefix,
                title: job.title || "Unknown Title",
                artistName: job.artistName || "Unknown Artist",
                genre: detectedGenre,
                imagekitUrl: imageKitResult?.url || null,
            },
        });

        await step.run("final-job-cleanup", async () => {
            if (fs.existsSync(localFolderPath)) {
                fs.rmSync(localFolderPath, { recursive: true, force: true });
                console.log(`🧹 [Job ${jobId}] Final cleanup complete: ${localFolderPath}`);
            }
        });

        return { success: true, songS3Prefix, imagekitUrl: imageKitResult?.url };
    }
);