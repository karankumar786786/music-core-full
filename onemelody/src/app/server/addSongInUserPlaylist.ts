"use server";
import { client } from "@/lib/supabase";

export async function addSongInUserPlaylist(playlistId: number, songId: number) {
    try {
        // Check if already exists to prevent duplicates
        const { data: existing, error: checkError } = await client
            .from("user_playlist_songs")
            .select("id")
            .eq('playlistId', playlistId)
            .eq('songId', songId)
            .maybeSingle();

        if (checkError) {
            console.error("Error checking existence:", checkError);
        }

        if (existing) {
            return { success: true, message: "Song already in playlist" };
        }

        const { data, error } = await client
            .from("user_playlist_songs")
            .insert({
                playlistId: playlistId,
                songId: songId
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding song to playlist:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Unexpected error adding song to playlist:", error);
        return { success: false, error: "Unexpected error" };
    }
}
