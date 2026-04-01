import * as recombee from 'recombee-api-client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../music-backend/.env' });

const { ApiClient, requests } = recombee;

// Assuming Recombee keys are known from previous implementation (one-org-one-melody / pN8aXBwXNHjUJyceeab9si9keRB8bDNyYFdrWpqmddXScnoLcG8jGf7r9PkdX1jR)
const client = new ApiClient(
    'one-org-one-melody',
    'pN8aXBwXNHjUJyceeab9si9keRB8bDNyYFdrWpqmddXScnoLcG8jGf7r9PkdX1jR',
    { region: 'eu-west' }
);

async function main() {
    console.log("🗑️ Resetting Recombee Database...");
    await client.send(new requests.ResetDatabase());
    console.log("✅ Recombee Database wiped clean.");
}

main().catch(console.error);
