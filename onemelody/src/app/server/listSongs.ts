"use server";
import { client } from "@/lib/supabase";

export async function listAllSongs() {
    try {
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
        .eq("processing",false).order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase List Songs Error:", error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error("List Songs Error:", error);
        return [];
    }
}