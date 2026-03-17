import { client } from "../client";
import * as fs from "node:fs";
import * as path from "node:path";
import { getPrismaClient } from "../../prisma/getPrismaClient";
import { SignatureUtility } from "../../signature/signature.utility";
import { getObject } from "../../storage/getObject.s3";
import { processPlaylistImages } from "../../imageProcessors";
import { uploadProcessedImages, IMAGE_S3_BASE_FOLDERS } from "../../imageProcessors/uploadProcessedImages/uploadImages";
import { cleanupProcessedImagesFolder } from "../../imageProcessors/uploadProcessedImages/cleanup";

const prisma = getPrismaClient();

export const playlistProcessingFunction = client.createFunction(
    {
        id: "playlist-processing-v1",
        name: "Playlist Processing",
        retries: 3,
    },
    { event: "playlist-process-job" },
    async ({ event, step }: { event: any, step: any }) => {
        const jobId = event.data.jobId;
        const { tempCoverImageKey, tempBannerImageKey } = event.data;

        console.log(`📡 [Playlist Job ${jobId}] Received playlist-process-job event`);

        // Fetch job details
        const job = await step.run("fetch-job-details", async () => {
            return await prisma.playlistProcessingJob.findUnique({
                where: { id: jobId },
            });
        });

        if (!job) {
            throw new Error(`Playlist Job ${jobId} not found`);
        }

        const localFolderPath = path.join(process.cwd(), "processing", "playlist", jobId);

        await step.run("process-playlist-images", async () => {
            const tempImageDir = path.join(localFolderPath, "imageInput");
            const processedImageDir = path.join(localFolderPath, "imageOutput");

            // Process Cover
            if (tempCoverImageKey) {
                await getObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempCoverImageKey,
                    outputDir: tempImageDir,
                });

                await processPlaylistImages({
                    coverImage: { inputFilePath: path.join(tempImageDir, path.basename(tempCoverImageKey)), outputDirPath: processedImageDir }
                });

                await uploadProcessedImages(processedImageDir, IMAGE_S3_BASE_FOLDERS.PLAYLIST, jobId, "cover");
            }

            // Process Banner
            if (tempBannerImageKey) {
                await getObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempBannerImageKey,
                    outputDir: tempImageDir,
                });

                await processPlaylistImages({
                    bannerImage: { inputFilePath: path.join(tempImageDir, path.basename(tempBannerImageKey)), outputDirPath: processedImageDir }
                });

                await uploadProcessedImages(processedImageDir, IMAGE_S3_BASE_FOLDERS.PLAYLIST, jobId, "banner");
            }

            cleanupProcessedImagesFolder(localFolderPath);
        });

        const updatedJob = await step.run("update-job-and-playlist", async () => {
            const processedKey = `${IMAGE_S3_BASE_FOLDERS.PLAYLIST}${jobId}`;

            // Update Job
            await prisma.playlistProcessingJob.update({
                where: { id: jobId },
                data: {
                    processedImages: true,
                    completed: true,
                    currentStatus: "completed",
                    processedKey: processedKey
                }
            });

            // Upsert Playlist
            await prisma.playlist.upsert({
                where: { title: job.title },
                update: {
                    description: job.description,
                    storageKey: processedKey
                },
                create: {
                    id: SignatureUtility.generateSignedId(),
                    title: job.title,
                    description: job.description,
                    storageKey: processedKey
                }
            });

            return { processedKey };
        });

        return { success: true, jobId, processedKey: updatedJob.processedKey };
    }
);
