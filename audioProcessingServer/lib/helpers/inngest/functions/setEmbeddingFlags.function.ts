import { client } from "../client";
import { getPrismaClient } from "../../prisma/getPrismaClient";

const prisma = getPrismaClient();

export const setEmbeddingFlagsFunction = client.createFunction(
    { id: "set-embedding-flags-v2" },
    { event: "vector-embedding-completed" },
    async ({ event, step }: { event: any, step: any }) => {
        const jobId = event.data.jobId;
        const { vectorId, qdrantPointId } = event.data;
        console.log(`📡 [Job ${jobId}] Received vector-embedding-completed event for vectorId: ${vectorId}`);

        // Set the two flags Python could not set
        await step.run("set-embedding-flags", async () => {
            await prisma.songProcessingJob.update({
                where: { id: jobId },
                data: {
                    extractedAudioFeatures: true,
                    generatedEmbeddings: true,
                    currentStatus: "embeddings_completed",
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
