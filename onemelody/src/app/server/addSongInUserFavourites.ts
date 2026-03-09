"use server";
import { client } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function addSongInUserFavourites(songId: number) {
    try {
        const { userId } = await auth();

        if (!userId) {
            console.error("User not authenticated");
            return { success: false, error: "Not authenticated" };
        }

        // Check if already exists to prevent duplicates
        const { data: existing } = await client
            .from("userFavourites")
            .select("id")
            .eq('userId', userId)
            .eq('songId', songId)
            .single();

        if (existing) {
            return { success: true, message: "Song already in favourites" };
        }

        const { data, error } = await client
            .from("userFavourites")
            .insert({
                userId,
                songId
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding song to favourites:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Unexpected error adding song to favourites:", error);
        return { success: false, error: "Unexpected error" };
    }
}
