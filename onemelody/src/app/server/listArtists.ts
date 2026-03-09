"use server";
import { client } from "@/lib/supabase";

export async function listAllArtists() {
    try {
        const { data, error } = await client.from('artists').select(`
            id,
            stage_name,
            real_name,
            bio,
            profileImageUrl,
            created_at
        `).order('created_at', { ascending: false });

        if (error) {
            console.error("Error listing artists:", error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error("Unexpected error listing artists:", error);
        return [];
    }
}