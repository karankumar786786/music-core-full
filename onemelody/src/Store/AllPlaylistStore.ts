import { create } from 'zustand';
import { Playlist } from '@/types';

interface AllPlaylistState {
    playlists: Playlist[];
    setPlaylists: (playlists: Playlist[]) => void;
    addPlaylist: (playlist: Playlist) => void;
}

export const useAllPlaylistStore = create<AllPlaylistState>((set) => ({
    playlists: [],
    setPlaylists: (playlists) => set({ playlists }),
    addPlaylist: (playlist) => set((state) => ({ playlists: [...state.playlists, playlist] })),
}));
