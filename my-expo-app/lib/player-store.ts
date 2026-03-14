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

type QueueSource = 'feed' | 'user' | 'empty';

interface PlayerState {
    currentSong: PlayerSong | null;
    isPlaying: boolean;
    queue: PlayerSong[];
    lastQueueIndex: number;
    isShuffle: boolean;
    repeatMode: 'none' | 'one' | 'all';
    queueSource: QueueSource;
}

export const playerStore = new Store<PlayerState>({
    currentSong: null,
    isPlaying: false,
    queue: [],
    lastQueueIndex: -1,
    isShuffle: false,
    repeatMode: 'none',
    queueSource: 'empty',
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
                // Same song — don't flip isPlaying here; let syncPlayback decide
                return { ...state, lastQueueIndex: newLastQueueIndex };
            }

            return {
                ...state,
                currentSong: song,
                // Never set isPlaying:true here — stream isn't loaded yet.
                // shouldAutoPlayRef in the context drives autoplay once ready.
                isPlaying: false,
                lastQueueIndex: newLastQueueIndex,
            };
        });
    },

    syncFeedToQueue: (songs: PlayerSong[]) => {
        playerStore.setState((state) => {
            if (state.queueSource === 'user') return state;

            let newIdx = -1;
            if (state.currentSong) {
                newIdx = songs.findIndex((s) => s.id === state.currentSong?.id);
            }
            return {
                ...state,
                queue: songs,
                lastQueueIndex: newIdx,
                queueSource: 'feed',
            };
        });
        const actions = playerActions as any;
        actions._fallbackPool = [];
        actions._fallbackPoolFetched = true;
    },

    playSong: (song: PlayerSong) => {
        playerStore.setState((state) => {
            const existingIdx = state.queue.findIndex((s) => s.id === song.id);

            if (existingIdx !== -1) {
                return {
                    ...state,
                    currentSong: song,
                    // Never set isPlaying:true — stream not loaded yet
                    isPlaying: false,
                    lastQueueIndex: existingIdx,
                };
            }

            const insertAt = state.lastQueueIndex + 1;
            const newQueue = [
                ...state.queue.slice(0, insertAt),
                song,
                ...state.queue.slice(insertAt),
            ];

            return {
                ...state,
                queue: newQueue,
                currentSong: song,
                // Never set isPlaying:true — stream not loaded yet
                isPlaying: false,
                lastQueueIndex: insertAt,
            };
        });
        musicApi.addView(song.id).catch(() => {});
    },

    playAll: (songs: PlayerSong[]) => {
        console.log('[PlayerStore] playAll called with', songs.length, 'songs');
        if (songs.length === 0) return;
        playerStore.setState((state) => ({
            ...state,
            queue: songs,
            lastQueueIndex: 0,
            currentSong: songs[0],
            // Never set isPlaying:true — stream not loaded yet.
            // shouldAutoPlayRef in context is already true (set before this call),
            // so syncPlayback will call player.play() once replaceAsync resolves.
            isPlaying: false,
            queueSource: 'user',
        }));
        musicApi.addView(songs[0].id).catch(() => {});
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
                playerStore.setState((state) => ({
                    ...state,
                    currentSong: song,
                    isPlaying: false,
                    queue: state.queue.length === 0 ? [song] : state.queue,
                    lastQueueIndex: state.queue.length === 0 ? 0 : state.lastQueueIndex,
                }));
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

    playPrevious: (currentPosition: number = 0): 'restart' | 'previous' => {
        const { queue, lastQueueIndex, repeatMode } = playerStore.state;

        if (currentPosition > 3) {
            // Just signal restart — context will seekTo(0), no isPlaying flip needed
            return 'restart';
        }

        if (queue.length === 0) return 'restart';

        const prevIndex = lastQueueIndex - 1;

        if (prevIndex >= 0) {
            const prevSong = queue[prevIndex];
            playerActions.setCurrentSong(prevSong);
            musicApi.addView(prevSong.id).catch(() => {});
        } else if (repeatMode === 'all' && queue.length > 0) {
            const lastSong = queue[queue.length - 1];
            playerActions.setCurrentSong(lastSong);
            musicApi.addView(lastSong.id).catch(() => {});
        } else {
            return 'restart';
        }

        return 'previous';
    },

    playNext: async () => {
        const { queue, lastQueueIndex, isShuffle, repeatMode, currentSong } = playerStore.state;

        if (repeatMode === 'one' && currentSong) {
            // Signal context to restart — don't touch isPlaying
            playerStore.setState((s) => ({ ...s, isPlaying: false }));
            return;
        }

        let nextIndex = lastQueueIndex + 1;
        if (lastQueueIndex === -1 && queue.length > 0) {
            nextIndex = 0;
        }

        if (isShuffle && queue.length > 1) {
            do {
                nextIndex = Math.floor(Math.random() * queue.length);
            } while (nextIndex === lastQueueIndex);
        } else if (isShuffle && queue.length === 1) {
            nextIndex = 0;
        }

        if (nextIndex >= 0 && nextIndex < queue.length) {
            const nextSong = queue[nextIndex];
            playerActions.setCurrentSong(nextSong);
            musicApi.addView(nextSong.id).catch(() => {});
        } else if (repeatMode === 'all' && queue.length > 0) {
            const nextSong = queue[0];
            playerActions.setCurrentSong(nextSong);
            musicApi.addView(nextSong.id).catch(() => {});
        } else {
            await playerActions.playNextFromFallback();
        }

        const finalQueue = playerStore.state.queue;
        const finalIdx = playerStore.state.lastQueueIndex;
        const remaining = finalQueue.length - finalIdx - 1;
        if (finalQueue.length > 0 && remaining <= 2) {
            playerActions.fetchAndAddFeedToQueue();
        }
    },

    _fallbackPool: [] as PlayerSong[],
    _fallbackPoolFetched: false,
    _fallbackPoolFetching: false,

    playNextFromFallback: async () => {
        const actions = playerActions as any;
        const existingIds = new Set(playerStore.state.queue.map((s) => s.id));

        if (!actions._fallbackPoolFetched && !actions._fallbackPoolFetching) {
            actions._fallbackPoolFetching = true;
            try {
                const res = await musicApi.getSongs(1, 10);
                if (res?.data) {
                    const mapped: PlayerSong[] = res.data.map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        artistName: s.artistName,
                        storageKey: s.storageKey,
                        coverUrl: getCoverImageUrl(s.storageKey, 'large', true) || null,
                    }));
                    actions._fallbackPool = mapped
                        .filter((s: PlayerSong) => !existingIds.has(s.id))
                        .slice(0, 2);
                }
            } catch (err) {
                console.warn('Fallback pool fetch failed:', err);
            } finally {
                actions._fallbackPoolFetched = true;
                actions._fallbackPoolFetching = false;
            }
        }

        const pool: PlayerSong[] = actions._fallbackPool;
        const nextFallback = pool.find((s) => !existingIds.has(s.id));

        if (nextFallback) {
            actions._fallbackPool = pool.filter((s: PlayerSong) => s.id !== nextFallback.id);

            playerStore.setState((state) => ({
                ...state,
                queue: [...state.queue, nextFallback],
                currentSong: nextFallback,
                // Never set isPlaying:true — stream not loaded yet
                isPlaying: false,
                lastQueueIndex: state.queue.length,
                queueSource: 'feed',
            }));
            musicApi.addView(nextFallback.id).catch(() => {});
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
                    const freshFeedSongs = newSongs.filter((s) => !existingIds.has(s.id));
                    if (freshFeedSongs.length === 0) return state;

                    const played = state.queue.slice(0, state.lastQueueIndex + 1);
                    const actions = playerActions as any;
                    const fallbackIds = new Set(
                        (actions._fallbackPool as PlayerSong[]).map((s: PlayerSong) => s.id)
                    );
                    const keptAhead = state.queue
                        .slice(state.lastQueueIndex + 1)
                        .filter((s) => !fallbackIds.has(s.id));

                    const merged = [...played, ...keptAhead, ...freshFeedSongs];

                    actions._fallbackPool = [];
                    actions._fallbackPoolFetched = true;

                    return { ...state, queue: merged };
                });

                return newSongs;
            }
        } catch (error) {
            console.error('Failed to fetch feed in store:', error);
        }
        return [];
    },
};