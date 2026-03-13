import { Store } from '@tanstack/react-store';
import { musicApi } from './api';
import { getCoverImageUrl } from './s3';

export interface PlayerSong {
    id: string;
    title: string;
    artistName: string;
    storageKey: string;
    coverUrl: string | null;
    songBaseUrl?: string;
}

interface PlayerState {
    currentSong: PlayerSong | null;
    isPlaying: boolean;
    queue: PlayerSong[];
    lastQueueIndex: number;
    isShuffle: boolean;
    repeatMode: 'none' | 'one' | 'all';
}

export const playerStore = new Store<PlayerState>({
    currentSong: null,
    isPlaying: false,
    queue: [],
    lastQueueIndex: -1,
    isShuffle: false,
    repeatMode: 'none',
});

export const playerActions = {
    setCurrentSong: (song: PlayerSong | null) => {
        playerStore.setState((state) => {
            let newLastQueueIndex = state.lastQueueIndex;
            if (song) {
                const idx = state.queue.findIndex((s) => s.id === song.id);
                if (idx !== -1) newLastQueueIndex = idx;
            }

            if (state.currentSong?.id === song?.id && song !== null) {
                return { ...state, isPlaying: true, lastQueueIndex: newLastQueueIndex };
            }

            return {
                ...state,
                currentSong: song,
                isPlaying: !!song,
                lastQueueIndex: newLastQueueIndex,
            };
        });
    },

    syncFeedToQueue: (songs: PlayerSong[]) => {
        playerStore.setState((state) => ({
            ...state,
            queue: songs,
            lastQueueIndex: -1,
        }));
    },

    playSong: (song: PlayerSong) => {
        playerActions.setCurrentSong(song);
        playerStore.setState((state) => {
            const idx = state.queue.findIndex((s) => s.id === song.id);
            if (idx !== -1) return { ...state, lastQueueIndex: idx };
            const newQueue = [...state.queue, song];
            return { ...state, queue: newQueue, lastQueueIndex: newQueue.length - 1 };
        });
        musicApi.addView(song.id).catch(() => { });
    },

    playAll: (songs: PlayerSong[]) => {
        if (songs.length === 0) return;
        playerStore.setState((state) => ({
            ...state,
            queue: songs,
            lastQueueIndex: 0,
            currentSong: songs[0],
            isPlaying: true,
        }));
        musicApi.addView(songs[0].id).catch(() => { });
    },

    addToQueue: (songs: PlayerSong[]) => {
        playerStore.setState((state) => {
            const existingIds = new Set(state.queue.map((s) => s.id));
            const filtered = songs.filter((s) => !existingIds.has(s.id));
            return { ...state, queue: [...state.queue, ...filtered] };
        });
    },

    restoreFromHistory: async () => {
        try {
            const res = await musicApi.getHistory(1, 1);
            if (res?.data && res.data.length > 0) {
                const lastPlayed = res.data[0].song || res.data[0];
                const song: PlayerSong = {
                    id: lastPlayed.id,
                    title: lastPlayed.title,
                    artistName: lastPlayed.artistName,
                    storageKey: lastPlayed.storageKey,
                    coverUrl: getCoverImageUrl(lastPlayed.storageKey, 'large', true) || null,
                };
                playerActions.setCurrentSong(song);
                playerActions.setIsPlaying(false);
            }
        } catch (e) {
            console.warn('Failed to restore history in store:', e);
        }
    },

    setIsPlaying: (isPlaying: boolean) => {
        playerStore.setState((state) => {
            if (state.isPlaying === isPlaying) return state;
            return { ...state, isPlaying };
        });
    },

    toggleShuffle: () => {
        playerStore.setState((state) => ({ ...state, isShuffle: !state.isShuffle }));
    },

    toggleRepeat: () => {
        playerStore.setState((state) => {
            const next: Record<string, 'none' | 'one' | 'all'> = {
                none: 'all',
                all: 'one',
                one: 'none',
            };
            return { ...state, repeatMode: next[state.repeatMode] };
        });
    },

    playNext: async () => {
        const { queue, lastQueueIndex, isShuffle, repeatMode, currentSong } = playerStore.state;

        if (repeatMode === 'one' && currentSong) {
            playerStore.setState(s => ({ ...s, isPlaying: true }));
            return;
        }

        let nextIndex = lastQueueIndex + 1;
        if (lastQueueIndex === -1 && queue.length > 0) {
            nextIndex = 0;
        }

        if (isShuffle && queue.length > 0) {
            nextIndex = Math.floor(Math.random() * queue.length);
        }

        if (nextIndex >= 0 && nextIndex < queue.length) {
            const nextSong = queue[nextIndex];
            playerActions.setCurrentSong(nextSong);
            musicApi.addView(nextSong.id).catch(() => { });
        } else if (repeatMode === 'all' && queue.length > 0) {
            const nextSong = queue[0];
            playerActions.setCurrentSong(nextSong);
            musicApi.addView(nextSong.id).catch(() => { });
        } else {
            // Queue exhausted or empty - fallback to general songs
            try {
                const fallbackRes = await musicApi.getSongs(1, 10);
                if (fallbackRes?.data && fallbackRes.data.length > 0) {
                    const fallbackSongs: PlayerSong[] = fallbackRes.data.map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        artistName: s.artistName,
                        storageKey: s.storageKey,
                        coverUrl: getCoverImageUrl(s.storageKey, 'large', true) || null,
                    }));

                    // Skip songs already in queue
                    const existingIds = new Set(queue.map((s) => s.id));
                    const filtered = fallbackSongs.filter((s) => !existingIds.has(s.id));

                    if (filtered.length > 0) {
                        const firstFallback = filtered[0];
                        playerStore.setState((state) => ({
                            ...state,
                            queue: [...state.queue, ...filtered],
                            currentSong: firstFallback,
                            isPlaying: true,
                            lastQueueIndex: state.queue.length,
                        }));
                        setTimeout(() => musicApi.addView(firstFallback.id).catch(() => { }), 0);
                    }
                }
            } catch (err) {
                console.warn('Fallback fetch failed in playNext:', err);
            }
        }

        // Auto-fetch more feed songs if nearing end
        const finalQueue = playerStore.state.queue;
        const finalIdx = playerStore.state.lastQueueIndex;
        const remaining = finalQueue.length - finalIdx - 1;
        if (finalQueue.length > 0 && remaining <= 2) {
            playerActions.fetchAndAddFeedToQueue();
        }
    },

    playPrevious: () => {
        const { queue, lastQueueIndex, repeatMode, currentSong } = playerStore.state;
        if (queue.length === 0) return;

        let prevIndex = lastQueueIndex - 1;

        if (prevIndex >= 0) {
            const prevSong = queue[prevIndex];
            playerActions.setCurrentSong(prevSong);
            musicApi.addView(prevSong.id).catch(() => { });
        } else if (repeatMode === 'all' && queue.length > 0) {
            const lastSong = queue[queue.length - 1];
            playerActions.setCurrentSong(lastSong);
            musicApi.addView(lastSong.id).catch(() => { });
        } else {
            playerActions.setCurrentSong(currentSong);
            if (currentSong) musicApi.addView(currentSong.id).catch(() => { });
        }
    },

    fetchAndAddFeedToQueue: async () => {
        try {
            const { queue } = playerStore.state;
            const currentIds = queue.map((s) => s.id);
            const feedData = await musicApi.getFeed(currentIds);
            if (feedData && feedData.data) {
                const newSongs: PlayerSong[] = feedData.data.map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    artistName: s.artistName,
                    storageKey: s.storageKey,
                    coverUrl: getCoverImageUrl(s.storageKey, 'large', true) || null,
                }));
                playerStore.setState((state) => {
                    const existingIds = new Set(state.queue.map((s) => s.id));
                    const filteredNewSongs = newSongs.filter((s) => !existingIds.has(s.id));
                    return { ...state, queue: [...state.queue, ...filteredNewSongs] };
                });
                return newSongs;
            }
        } catch (error) {
            console.error('Failed to fetch feed in store:', error);
        }
        return [];
    },
};
