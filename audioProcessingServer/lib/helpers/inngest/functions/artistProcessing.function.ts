import { client } from "../client";
import * as fs from "node:fs";
import * as path from "node:path";
import { getPrismaClient } from "../../prisma/getPrismaClient";
import { SignatureUtility } from "../../signature/signature.utility";
import { getObject } from "../../storage/getObject.s3";
import { processArtistImages } from "../../imageProcessors";
import { uploadProcessedImages, IMAGE_S3_BASE_FOLDERS } from "../../imageProcessors/uploadProcessedImages/uploadImages";
import { cleanupProcessedImagesFolder } from "../../imageProcessors/uploadProcessedImages/cleanup";

const prisma = getPrismaClient();

export const artistProcessingFunction = client.createFunction(
    {
        id: "artist-processing-v1",
        name: "Artist Processing",
        retries: 3,
    },
    { event: "artist-process-job" },
    async ({ event, step }: { event: any, step: any }) => {
        const jobId = event.data.jobId;
        const { tempCoverImageKey, tempBannerImageKey } = event.data;

        console.log(`📡 [Artist Job ${jobId}] Received artist-process-job event`);

        // Fetch job details
        const job = await step.run("fetch-job-details", async () => {
            return await prisma.artistProcessingJob.findUnique({
                where: { id: jobId },
            });
        });

        if (!job) {
            throw new Error(`Artist Job ${jobId} not found`);
        }

        const localFolderPath = path.join(process.cwd(), "processing", "artist", jobId);

        await step.run("process-artist-images", async () => {
            const tempImageDir = path.join(localFolderPath, "imageInput");
            const processedImageDir = path.join(localFolderPath, "imageOutput");

            // Process Cover
            if (tempCoverImageKey) {
                const downloadPath = path.join(tempImageDir, "cover_" + path.basename(tempCoverImageKey));
                await getObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempCoverImageKey,
                    outputDir: tempImageDir,
                });

                await processArtistImages({
                    coverImage: { inputFilePath: path.join(tempImageDir, path.basename(tempCoverImageKey)), outputDirPath: processedImageDir }
                });

                await uploadProcessedImages(processedImageDir, IMAGE_S3_BASE_FOLDERS.ARTIST, jobId, "cover");
            }

            // Process Banner
            if (tempBannerImageKey) {
                const downloadPath = path.join(tempImageDir, "banner_" + path.basename(tempBannerImageKey));
                await getObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempBannerImageKey,
                    outputDir: tempImageDir,
                });

                await processArtistImages({
                    bannerImage: { inputFilePath: path.join(tempImageDir, path.basename(tempBannerImageKey)), outputDirPath: processedImageDir }
                });

                await uploadProcessedImages(processedImageDir, IMAGE_S3_BASE_FOLDERS.ARTIST, jobId, "banner");
            }

            cleanupProcessedImagesFolder(localFolderPath);
        });

        const updatedJob = await step.run("update-job-and-artist", async () => {
            const processedKey = `${IMAGE_S3_BASE_FOLDERS.ARTIST}${jobId}`;

            // Update Job
            await prisma.artistProcessingJob.update({
                where: { id: jobId },
                data: {
                    processedImages: true,
                    completed: true,
                    currentStatus: "completed",
                    processedKey: processedKey
                }
            });

            // Upsert Artist
            await prisma.artist.upsert({
                where: {
                    artistName_bio_dob: {
                        artistName: job.artistName,
                        bio: job.bio,
                        dob: job.dob
                    }
                },
                update: {
                    storageKey: processedKey
                },
                create: {
                    id: SignatureUtility.generateSignedId(),
                    artistName: job.artistName,
                    bio: job.bio,
                    dob: job.dob,
                    storageKey: processedKey
                }
            });

            return { processedKey };
        });

        return { success: true, jobId, processedKey: updatedJob.processedKey };
    }
);
