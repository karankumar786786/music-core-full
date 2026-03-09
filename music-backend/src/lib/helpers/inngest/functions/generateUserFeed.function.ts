import { client } from "../client";

export const generateUserFeed = client.createFunction(
    { id: "generate-user-feed" },
    { event: "feed/generate" },
    async ({ event, step }) => {
        const { positiveVectorIds, excludeSongIds, limit } = event.data;

        // Use step.invoke() to call the Python recommendation engine function
        const result = await step.invoke("call-python-recommender", {
            function: "embedderserver-generate-user-feed-fn" as any,
            data: {
                positiveVectorIds,
                excludeSongIds,
                limit: limit || 15,
            },
        });

        return { songIds: (result as any)?.songIds || [] };
    }
);
