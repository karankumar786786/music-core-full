"use server";
import { client } from "@/lib/supabase";

export async function listSongsByPlaylistId(playlistId: number) {
    try {
        const { data, error } = await client
            .from("system_playlist_songs")
            .select(`
                songId,
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
            .eq('playlistId', playlistId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error listing songs by playlist:", error);
            return [];
        }

        // Extract songs from the join result
        return data?.map(item => item.songs).filter(Boolean) || [];
    } catch (error) {
        console.error("Unexpected error listing songs by playlist:", error);
        return [];
    }
}
