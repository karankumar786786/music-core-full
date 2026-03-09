import { client } from "../client";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { getPrismaClient } from "../../prisma/getPrismaClient";
import { getObject } from "../../storage/getObject.s3";
import { putObject } from "../../storage/putObject.s3";
import { processSongImages } from "../../imageProcessors";
import { processAudioTranscription } from "../../audioProcessor/transcribeAudio";
import { processAudioTranscoding } from "../../audioProcessor/transcodeAudio";
import { uploadProcessedImages, IMAGE_S3_BASE_FOLDERS } from "../../imageProcessors/uploadProcessedImages/uploadImages";
import { cleanupProcessedImagesFolder } from "../../imageProcessors/uploadProcessedImages/cleanup";
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

        // Fetch the full job details to get metadata like title, artistName, genre
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

        const processImages = async () => {
            console.log(`📸 [Job ${jobId}] Starting image processing`);
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

            const processedImageDir = path.join(localFolderPath, "imageOutput");
            await step.run("process-images", async () => {
                console.log(`🖼️ [Job ${jobId}] Running processSongImages`);
                const { coverSuccess } = await processSongImages({
                    coverImage: { inputFilePath: downloadedImagePath, outputDirPath: processedImageDir }
                });
                console.log(`🖼️ [Job ${jobId}] processSongImages result: coverSuccess=${coverSuccess}`);
                if (!coverSuccess) {
                    throw new Error("Image processing failed");
                }
            });
            await updateJobStage("images-processed", { processedImages: true });

            await step.run("upload-images-to-s3", async () => {
                await uploadProcessedImages(processedImageDir, IMAGE_S3_BASE_FOLDERS.SONG, jobId, "cover");
                cleanupProcessedImagesFolder(processedImageDir);
                cleanupProcessedImagesFolder(tempImageDir);
            });
        };

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
                // We keep tempAudioDir for a moment to upload the raw audio to the production bucket
                return prefix;
            });

            // Upload raw audio for Embedder (in the processed folder)
            await step.run("upload-raw-audio-for-embedder", async () => {
                const rawAudioKey = `${songS3Prefix}/audio.mp3`;
                const audioInputPath = downloadedAudioPath;
                console.log(`📤 [Job ${jobId}] Uploading raw audio to ${rawAudioKey}`);
                const success = await putObject({
                    bucketName: process.env.AWS_PRODUCTION_BUCKET as string,
                    key: rawAudioKey,
                    body: fs.readFileSync(audioInputPath),
                    contentType: "audio/mpeg",
                });
                console.log(`📤 [Job ${jobId}] Raw audio upload success: ${success}`);
                if (!success) {
                    throw new Error("Raw audio upload failed");
                }
                cleanupProcessedFolder(tempAudioDir);
            });

            return songS3Prefix;
        };

        // Execution Flow
        console.log(`⌛ [Job ${jobId}] Running pipelines sequentially...`);

        const vectorId = await step.run("generate-vector-id", async () => {
            return randomUUID();
        });
        await updateJobStage("init-vector-id", { vectorId });

        await processImages();
        const songS3Prefix = await processAudio();

        await updateJobStage("pipeline-completed", {
            processedKey: songS3Prefix,
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
                genre: job.genre || "Unknown Genre",
            },
        });

        await step.run("final-job-cleanup", async () => {
            if (fs.existsSync(localFolderPath)) {
                fs.rmSync(localFolderPath, { recursive: true, force: true });
                console.log(`🧹 [Job ${jobId}] Final cleanup complete: ${localFolderPath}`);
            }
        });

        return { success: true, songS3Prefix };
    }
);