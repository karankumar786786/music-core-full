"use server";
import { client } from "@/lib/supabase";

export async function listSongsByUserPlaylistId(playlistId: number) {
    try {
        const { data, error } = await client
            .from("user_playlist_songs")
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
            .eq('playlistId', playlistId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error listing songs by user playlist:", error);
            return [];
        }

        // Extract songs from the join result
        return data?.map(item => ({
            addedAt: item.created_at,
            ...item.songs
        })).filter(Boolean) || [];
    } catch (error) {
        console.error("Unexpected error listing songs by user playlist:", error);
        return [];
    }
}
