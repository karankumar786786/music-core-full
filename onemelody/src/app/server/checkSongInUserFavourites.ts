"use server";
import { client } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function checkSongInUserFavourites(songId: number) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return false;
        }

        const { data, error } = await client
            .from("userFavourites")
            .select("id")
            .eq('userId', userId)
            .eq('songId', songId)
            .single();

        if (error) {
            // Not found is not an error in this case
            return false;
        }

        return !!data;
    } catch (error) {
        console.error("Unexpected error checking song in favourites:", error);
        return false;
    }
}
