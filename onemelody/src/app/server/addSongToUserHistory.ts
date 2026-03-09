"use server";
import { client } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function addSongToUserHistory(songId: number) {
    try {
        const { userId } = await auth();

        if (!userId) {
            console.error("User not authenticated");
            return { success: false, error: "Not authenticated" };
        }

        const { data, error } = await client
            .from("views")
            .insert({
                userId,
                songId
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding song to history:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Unexpected error adding song to history:", error);
        return { success: false, error: "Unexpected error" };
    }
}
