"use server";
import { client } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function deleteUserFavouriteSong(songId: number) {
    try {
        const { userId } = await auth();

        if (!userId) {
            console.error("User not authenticated");
            return { success: false, error: "Not authenticated" };
        }

        const { error } = await client
            .from("userFavourites")
            .delete()
            .eq('userId', userId)
            .eq('songId', songId);

        if (error) {
            console.error("Error deleting song from favourites:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error("Unexpected error deleting song from favourites:", error);
        return { success: false, error: "Unexpected error" };
    }
}
