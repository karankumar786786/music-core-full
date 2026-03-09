"use server";
import { client } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function deleteUserPlaylist(playlistId: number) {
    try {
        const { userId } = await auth();

        if (!userId) {
            console.error("User not authenticated");
            return { success: false, error: "Not authenticated" };
        }

        // First, delete all songs in the playlist
        const { error: songsError } = await client
            .from("user_playlist_songs")
            .delete()
            .eq('playlistId', playlistId);

        if (songsError) {
            console.error("Error deleting playlist songs:", songsError);
            return { success: false, error: songsError.message };
        }

        // Then delete the playlist itself (with userId check for security)
        const { error } = await client
            .from("user_playlist")
            .delete()
            .eq('id', playlistId)
            .eq('userId', userId);

        if (error) {
            console.error("Error deleting user playlist:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error("Unexpected error deleting user playlist:", error);
        return { success: false, error: "Unexpected error" };
    }
}
