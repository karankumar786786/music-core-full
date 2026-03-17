import { getCoverImageUrl } from "./s3";
import type { Song as PlayerSong } from "@/Store/playerStore";

export const mapToPlayerSong = (song: any): PlayerSong => {
    return {
        id: song.id,
        title: song.title,
        artist: song.artistName,
        coverImageUrl: getCoverImageUrl(song.storageKey, "small", true) || "",
        songBaseUrl: song.songBaseUrl || "",
        storageKey: song.storageKey,
        isLiked: song.isLiked,
    };
};

export const mapListToPlayerSongs = (songs: any[]): PlayerSong[] => {
    return songs.map(mapToPlayerSong);
};
