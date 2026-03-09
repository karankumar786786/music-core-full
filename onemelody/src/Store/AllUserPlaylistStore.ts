import { create } from 'zustand';
import { Playlist } from '@/types';

interface AllUserPlaylistState {
    userPlaylists: Playlist[];
    setUserPlaylists: (playlists: Playlist[]) => void;
    addUserPlaylist: (playlist: Playlist) => void;
}

export const useAllUserPlaylistStore = create<AllUserPlaylistState>((set) => ({
    userPlaylists: [],
    setUserPlaylists: (userPlaylists) => set({ userPlaylists }),
    addUserPlaylist: (playlist) => set((state) => ({ userPlaylists: [...state.userPlaylists, playlist] })),
}));
