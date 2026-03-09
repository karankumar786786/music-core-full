import { create } from 'zustand';
import { Song } from '@/types';

interface AllSongsState {
    songs: Song[];
    setSongs: (songs: Song[]) => void;
    addSong: (song: Song) => void;
    removeSong: (songId: string) => void;
}

export const useAllSongsStore = create<AllSongsState>((set) => ({
    songs: [],
    setSongs: (songs) => set({ songs }),
    addSong: (song) => set((state) => ({ songs: [...state.songs, song] })),
    removeSong: (songId) => set((state) => ({
        songs: state.songs.filter((s) => s.id !== songId)
    })),
}));
