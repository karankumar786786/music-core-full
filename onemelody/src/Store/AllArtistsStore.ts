import { create } from 'zustand';
import { Artist } from '@/types';

interface AllArtistsState {
    artists: Artist[];
    setArtists: (artists: Artist[]) => void;
    addArtist: (artist: Artist) => void;
}

export const useAllArtistsStore = create<AllArtistsState>((set) => ({
    artists: [],
    setArtists: (artists) => set({ artists }),
    addArtist: (artist) => set((state) => ({ artists: [...state.artists, artist] })),
}));
