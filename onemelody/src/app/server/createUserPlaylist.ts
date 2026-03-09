"use server";
import { client } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function createUserPlaylist(playlistName: string, isPublic: boolean = false) {
    try {
        const { userId } = await auth();

        if (!userId) {
            console.error("User not authenticated");
            return { success: false, error: "Not authenticated" };
        }

        const { data, error } = await client
            .from("user_playlist")
            .insert({
                playlist_name: playlistName,
                is_public: isPublic,
                userId
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating user playlist:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Unexpected error creating user playlist:", error);
        return { success: false, error: "Unexpected error" };
    }
}
