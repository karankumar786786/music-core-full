import { client } from "../client";
import { getPrismaClient } from "../../prisma/getPrismaClient";

const prisma = getPrismaClient();

export const setRecombeeFlagsFunction = client.createFunction(
    { id: "set-recombee-flags-v2" },
    { event: "recombee-sync-completed" },
    async ({ event, step }: { event: any, step: any }) => {
        const jobId = event.data.jobId;
        const { genre } = event.data;
        console.log(`📡 [Job ${jobId}] Received recombee-sync-completed event with genre: ${genre}`);

        // Set the final flags and genre from Python Essentia processing
        await step.run("set-recombee-flags", async () => {
            await prisma.songProcessingJob.update({
                where: { id: jobId },
                data: {
                    extractedAudioFeatures: true,
                    generatedEmbeddings: true, // Legacy flag, kept for backward compatibility checking
                    genre: genre,
                    currentStatus: "recombee_sync_completed",
                },
            });
        });

        // Bridge to the final table update stage
        console.log(`🚀 [Job ${jobId}] Triggering final table update`);
        await step.sendEvent("trigger-final-table-update", {
            name: "updateSongsTableAfterProcessingCompletion",
            data: { jobId },
        });

        return { success: true, jobId };
    },
);
