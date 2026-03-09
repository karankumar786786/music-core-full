import { create } from 'zustand';
import { Song } from '@/types';

interface UserFavouriteState {
    favouriteSongs: Song[];
    setFavouriteSongs: (songs: Song[]) => void;
    addFavourite: (song: Song) => void;
    removeFavourite: (songId: string) => void;
}

export const useUserFavouriteSongsStore = create<UserFavouriteState>((set) => ({
    favouriteSongs: [],
    setFavouriteSongs: (favouriteSongs) => set({ favouriteSongs }),
    addFavourite: (song) => set((state) => ({
        favouriteSongs: [...state.favouriteSongs, song]
    })),
    removeFavourite: (songId) => set((state) => ({
        favouriteSongs: state.favouriteSongs.filter((s) => s.id !== songId)
    })),
    toggleFavourite: (song: Song) => set((state) => {
        const isFavourite = state.favouriteSongs.some((s) => s.id === song.id);
        if (isFavourite) {
            return { favouriteSongs: state.favouriteSongs.filter((s) => s.id !== song.id) };
        }
        return { favouriteSongs: [...state.favouriteSongs, song] };
    }),
}));
