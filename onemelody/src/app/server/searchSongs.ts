"use server";
import { client } from "@/lib/supabase";

export async function searchSongs(query: string) {
    try {
        if (!query || query.trim().length === 0) {
            return [];
        }

        const searchTerm = `%${query.trim()}%`;

        const { data, error } = await client.from("songs").select(`
            id,
            title,
            album,
            duration,
            coverImageUrl,
            songUrl,
            language,
            artist_stage_name,
            created_at
        `)
            .eq("processing", false)
            .or(`title.ilike.${searchTerm},artist_stage_name.ilike.${searchTerm}`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase Search Songs Error:", error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error("Search Songs Error:", error);
        return [];
    }
}
