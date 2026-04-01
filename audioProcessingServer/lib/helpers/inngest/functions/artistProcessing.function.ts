import { client } from "../client";
import * as fs from "node:fs";
import * as path from "node:path";
import { getPrismaClient } from "../../prisma/getPrismaClient";
import { SignatureUtility } from "../../signature/signature.utility";
import { getObject } from "../../storage/getObject.s3";
import { deleteObject } from "../../storage/deleteObject.s3";
import { uploadImageToImageKit } from "../../imageKit/uploadImage";

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
        const tempImageDir = path.join(localFolderPath, "imageInput");

        // ── Upload Images to ImageKit ──────────────────────────────────────────
        const imagekitResults = await step.run("upload-artist-images-imagekit", async () => {
            const results: { cover?: string; banner?: string } = {};

            // Process Cover
            if (tempCoverImageKey) {
                await getObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempCoverImageKey,
                    outputDir: tempImageDir,
                });
                const localPath = path.join(tempImageDir, path.basename(tempCoverImageKey));
                const result = await uploadImageToImageKit(
                    localPath,
                    `artists/${jobId}`,
                    "cover"
                );
                results.cover = result.url;
                console.log(`✅ [Artist Job ${jobId}] Cover uploaded to ImageKit: ${result.url}`);
            }

            // Process Banner
            if (tempBannerImageKey) {
                await getObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempBannerImageKey,
                    outputDir: tempImageDir,
                });
                const localPath = path.join(tempImageDir, path.basename(tempBannerImageKey));
                const result = await uploadImageToImageKit(
                    localPath,
                    `artists/${jobId}`,
                    "banner"
                );
                results.banner = result.url;
                console.log(`✅ [Artist Job ${jobId}] Banner uploaded to ImageKit: ${result.url}`);
            }

            // Cleanup local temp dir
            if (fs.existsSync(localFolderPath)) {
                fs.rmSync(localFolderPath, { recursive: true, force: true });
            }

            return results;
        });

        // ── Cleanup Temp S3 Objects ────────────────────────────────────────────
        await step.run("cleanup-temp-s3", async () => {
            if (tempCoverImageKey) {
                await deleteObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempCoverImageKey,
                });
                console.log(`🧹 [Artist Job ${jobId}] Deleted temp cover from S3: ${tempCoverImageKey}`);
            }
            if (tempBannerImageKey) {
                await deleteObject({
                    bucketName: process.env.AWS_TEMP_BUCKET as string,
                    key: tempBannerImageKey,
                });
                console.log(`🧹 [Artist Job ${jobId}] Deleted temp banner from S3: ${tempBannerImageKey}`);
            }
        });

        // ── Update DB ──────────────────────────────────────────────────────────
        const updatedJob = await step.run("update-job-and-artist", async () => {
            // Store ImageKit cover URL as processedKey (primary image reference)
            const processedKey = imagekitResults.cover || imagekitResults.banner || "";

            await prisma.artistProcessingJob.update({
                where: { id: jobId },
                data: {
                    processedKey: processedKey, // Backwards compat
                    coverUrl: processedKey,
                    bannerUrl: imagekitResults.banner || null
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
                    storageKey: `artists/${jobId}`,
                    coverUrl: processedKey,
                    bannerUrl: imagekitResults.banner || null
                },
                create: {
                    id: SignatureUtility.generateSignedId(),
                    artistName: job.artistName,
                    bio: job.bio,
                    dob: job.dob,
                    storageKey: `artists/${jobId}`,
                    coverUrl: processedKey,
                    bannerUrl: imagekitResults.banner || null
                }
            });

            return { processedKey };
        });

        return {
            success: true,
            jobId,
            processedKey: updatedJob.processedKey,
            imagekitUrls: imagekitResults,
        };
    }
);
