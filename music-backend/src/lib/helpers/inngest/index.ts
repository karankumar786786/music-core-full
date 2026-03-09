import { client } from "./client";
import { helloWorld } from "./functions/helloWorld.function"
import { generateUserFeed } from "./functions/generateUserFeed.function"

// Export client for global usage
export { client };

// No functions are served here as they are offloaded to embeddedInngestServer
export const functions = [helloWorld, generateUserFeed];