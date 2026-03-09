"use server";
import { client } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function listUserHistory() {
    try {
        const { userId } = await auth();

        if (!userId) {
            console.error("User not authenticated");
            return [];
        }

        const { data, error } = await client
            .from("views")
            .select(`
                songId,
                created_at,
                songs (
                    id,
                    title,
                    album,
                    duration,
                    coverImageUrl,
                    songUrl,
                    language,
                    artist_stage_name,
                    created_at
                )
            `)
            .eq('userId', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error listing user history:", error);
            return [];
        }

        // Extract songs from the join result
        return (data?.map(item => item.songs).filter(Boolean) || []) as any[];
    } catch (error) {
        console.error("Unexpected error listing user history:", error);
        return [];
    }
}
