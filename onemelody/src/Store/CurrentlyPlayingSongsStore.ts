import { create } from 'zustand';
import { Song } from '@/types';

interface CurrentlyPlayingState {
    currentSong: Song | null;
    queue: Song[];
    isPlaying: boolean;
    volume: number;
    currentTime: number;
    duration: number;
    setCurrentSong: (song: Song | null) => void;
    setQueue: (songs: Song[]) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setVolume: (volume: number) => void;
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
}

export const useCurrentlyPlayingSongsStore = create<CurrentlyPlayingState>((set) => ({
    currentSong: null,
    queue: [],
    isPlaying: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    setCurrentSong: (song) => set({ currentSong: song }),
    setQueue: (queue) => set({ queue }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setVolume: (volume) => set({ volume }),
    setCurrentTime: (currentTime) => set({ currentTime }),
    setDuration: (duration) => set({ duration }),
}));
