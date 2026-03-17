import { client } from "../client";

export const helloWorld = client.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        await step.run("say-hello", async () => {
            return { message: `Hello ${event.data.name || "World"}!` };
        });
    }
);
