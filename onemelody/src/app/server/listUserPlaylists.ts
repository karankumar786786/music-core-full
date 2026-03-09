"use server";
import { client } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function listUserPlaylists() {
    try {
        const { userId } = await auth();

        if (!userId) {
            console.error("User not authenticated");
            return [];
        }

        const { data, error } = await client
            .from("user_playlist")
            .select(`
                id,
                playlist_name,
                is_public,
                created_at
            `)
            .eq('userId', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error listing user playlists:", error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error("Unexpected error listing user playlists:", error);
        return [];
    }
}
