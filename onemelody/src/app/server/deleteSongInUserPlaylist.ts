"use server";
import { client } from "@/lib/supabase";

export async function deleteSongInUserPlaylist(playlistId: number, songId: number) {
    try {
        const { error } = await client
            .from("user_playlist_songs")
            .delete()
            .eq('playlistId', playlistId)
            .eq('songId', songId);

        if (error) {
            console.error("Error deleting song from playlist:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error("Unexpected error deleting song from playlist:", error);
        return { success: false, error: "Unexpected error" };
    }
}
