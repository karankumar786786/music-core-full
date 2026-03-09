import { create } from 'zustand';
import { Song } from '@/types';

interface AllPlaylistSongsState {
    playlistSongs: Record<string, Song[]>; // playlistId -> Song[]
    setPlaylistSongs: (playlistId: string, songs: Song[]) => void;
    addSongToPlaylist: (playlistId: string, song: Song) => void;
}

export const useAllPlaylistSongsStore = create<AllPlaylistSongsState>((set) => ({
    playlistSongs: {},
    setPlaylistSongs: (playlistId, songs) =>
        set((state) => ({
            playlistSongs: { ...state.playlistSongs, [playlistId]: songs }
        })),
    addSongToPlaylist: (playlistId, song) =>
        set((state) => ({
            playlistSongs: {
                ...state.playlistSongs,
                [playlistId]: [...(state.playlistSongs[playlistId] || []), song]
            }
        })),
}));
