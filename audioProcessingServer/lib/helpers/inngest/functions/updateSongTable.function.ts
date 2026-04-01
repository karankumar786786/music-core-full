
import { client } from "../client";
import { getPrismaClient } from "../../prisma/getPrismaClient";
import { SignatureUtility } from "../../signature/signature.utility";

const prisma = getPrismaClient();

export const updateSongsTableFunction = client.createFunction(
    { id: "update-songs-table-v2" },
    { event: "updateSongsTableAfterProcessingCompletion" },
    async ({ event, step }: { event: any, step: any }) => {
        const jobId = event.data.jobId;
        console.log(`📡 [Job ${jobId}] Received updateSongsTableAfterProcessingCompletion event`);

        // Fetch the processing job
        const job = await step.run("fetch-job", async () => {
            return await prisma.songProcessingJob.findUnique({
                where: { id: jobId }
            });
        });

        if (!job) {
            throw new Error(`Job with id ${jobId} not found`);
        }

        console.log(`🧐 [Job ${jobId}] Full Completion Check Details:`, {
            title: job.title,
            transcribed: !!job.transcribed,
            transcoded: !!job.transcoded,
            processedImages: !!job.processedImages,
            extractedAudioFeatures: !!job.extractedAudioFeatures,
            generatedEmbeddings: !!job.generatedEmbeddings,
            processedKey: job.processedKey,
            vectorId: job.vectorId
        });

        const isAllCompleted =
            Boolean(job.transcribed) &&
            Boolean(job.transcoded) &&
            Boolean(job.processedImages) &&
            Boolean(job.extractedAudioFeatures) &&
            Boolean(job.generatedEmbeddings);

        console.log(`🧐 [Job ${jobId}] Final decision - isAllCompleted: ${isAllCompleted}`);

        if (!isAllCompleted) {
            // change the status to pending thats it
            await step.run("set-status-pending", async () => {
                await prisma.songProcessingJob.update({
                    where: { id: jobId },
                    data: { currentStatus: "pending" }
                });
            });
            return { message: "Job is not fully processed yet. Status set to pending." };
        }

        // Step 2: update the songs table
        try {
            await step.run("update-songs-table", async () => {
                console.log(`📝 [Job ${jobId}] Upserting song into table: ${job.title}`);

                console.log(`Checking song with vector ID: ${job.vectorId}`);

                let song = await prisma.song.findUnique({
                    where: { vectorId: job.vectorId },
                });

                if (!song) {
                    song = await prisma.song.create({
                        data: {
                            id: job.songId,
                            vectorId: job.vectorId || `pending-vectorId-${job.id}`,
                            title: job.title,
                            artistName: job.artistName,
                            durationMs: job.durationMs,
                            storageKey: job.processedKey || "",
                            releaseDate: job.releaseDate,
                            isrc: job.isrc,
                            genre: job.genre || "Unknown",
                            coverUrl: job.coverUrl || "",
                        }
                    });
                    console.log(`✅ [Job ${jobId}] Song create successful with ID: ${job.songId}`);
                }
            });
        } catch (dbError) {
            console.error(`❌ [Job ${jobId}] Database upsert failed:`, dbError);
            await step.run("mark-as-failed", async () => {
                await prisma.songProcessingJob.update({
                    where: { id: jobId },
                    data: { currentStatus: "db_update_failed" }
                });
            });
            throw dbError; // rethrow to let Inngest handle retries or failure
        }
        await step.run("update-job-card-completed", async () => {
            await prisma.songProcessingJob.update({
                where: { id: jobId },
                data: {
                    updatedSongTable: true,
                    completed: true,
                    processingCompleted: true,
                    currentStatus: "completed"
                }
            });
        });

        return { message: "Song table updated and job card marked as completed." };
    }
);