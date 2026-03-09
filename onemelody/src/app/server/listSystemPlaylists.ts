"use server";
import { client } from "@/lib/supabase";


export async function listSystemPlaylists() {
    try {
        const { data, error } = await client
            .from("system_playlist")
            .select("id, playlistName, playlistCoverImageUrl")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error listing system playlists:", error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error("Unexpected error listing system playlists:", error);
        return [];
    }
}