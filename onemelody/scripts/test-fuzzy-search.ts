import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local manually
const loadEnv = () => {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach((line) => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
                    process.env[key] = value;
                }
            });
        }
    } catch (e) {
        console.error("Error loading .env.local", e);
    }
};

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables!");
    process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

async function testFuzzySearch() {
    const query = process.argv[2] || "love"; // Default search term
    console.log(`Testing fuzzy search for: "${query}"...`);

    try {
        const searchTerm = `%${query}%`;
        const { data, error } = await client.from("songs").select(`
            id,
            title,
            artist_stage_name
        `)
            .eq("processing", false)
            .or(`title.ilike.${searchTerm},artist_stage_name.ilike.${searchTerm}`)
            .limit(5);

        if (error) {
            console.error("Error:", error);
        } else {
            console.log("Found songs:", data?.length);
            data?.forEach(song => {
                console.log(`- ${song.title} by ${song.artist_stage_name}`);
            });
        }
    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

testFuzzySearch();
