import { create } from 'zustand';
import { Song } from '@/types';

interface AllUserPlaylistSongsState {
    userPlaylistSongs: Record<string, Song[]>; // playlistId -> Song[]
    setUserPlaylistSongs: (playlistId: string, songs: Song[]) => void;
    addSongToUserPlaylist: (playlistId: string, song: Song) => void;
}

export const useAllUserPlaylistSongsStore = create<AllUserPlaylistSongsState>((set) => ({
    userPlaylistSongs: {},
    setUserPlaylistSongs: (playlistId, songs) =>
        set((state) => ({
            userPlaylistSongs: { ...state.userPlaylistSongs, [playlistId]: songs }
        })),
    addSongToUserPlaylist: (playlistId, song) =>
        set((state) => ({
            userPlaylistSongs: {
                ...state.userPlaylistSongs,
                [playlistId]: [...(state.userPlaylistSongs[playlistId] || []), song]
            }
        })),
}));
