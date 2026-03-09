import { create } from 'zustand';
import { Song } from '@/types';

interface UserHistoryState {
    historySongs: Song[];
    setHistorySongs: (songs: Song[]) => void;
    addToHistory: (song: Song) => void;
}

export const useUserHistorySongsStore = create<UserHistoryState>((set) => ({
    historySongs: [],
    setHistorySongs: (historySongs) => set({ historySongs }),
    addToHistory: (song) => set((state) => {
        // Add to top, remove if already exists (bring to front)
        const filtered = state.historySongs.filter((s) => s.id !== song.id);
        return { historySongs: [song, ...filtered] };
    }),
}));
