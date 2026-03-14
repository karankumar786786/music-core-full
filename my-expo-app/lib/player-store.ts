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

// 'feed'  — queue is from AI feed, safe to overwrite with fresh feed data
// 'user'  — queue was set intentionally by user (playAll from playlist/artist), never overwrite
// 'empty' — nothing loaded yet
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
        playerStore.setState((state) => {
            // Never overwrite a user-intentional queue (playlist / artist playAll)
            // Feed can only replace 'feed' or 'empty' queues
            if (state.queueSource === 'user') {
                // Feed arrived but user is in their own queue — just reset fallback pool
                // and return state untouched
                return state;
            }

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
        // Feed has arrived — reset fallback pool flags so it is no longer used
        const actions = playerActions as any;
        actions._fallbackPool = [];
        actions._fallbackPoolFetched = true;
    },

    playSong: (song: PlayerSong) => {
        playerStore.setState((state) => {
            const existingIdx = state.queue.findIndex((s) => s.id === song.id);

            if (existingIdx !== -1) {
                // Song already in queue — just move the pointer, queue untouched
                return {
                    ...state,
                    currentSong: song,
                    isPlaying: true,
                    lastQueueIndex: existingIdx,
                };
            }

            // Song not in queue — insert it right after the current position
            // so playNext continues from here into the existing feed queue.
            // This preserves everything ahead and behind.
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
                isPlaying: true,
                lastQueueIndex: insertAt,
            };
        });
        musicApi.addView(song.id).catch(() => { });
    },

    playAll: (songs: PlayerSong[]) => {
        console.log('[PlayerStore] playAll called with', songs.length, 'songs');
        if (songs.length === 0) return;
        playerStore.setState((state) => ({
            ...state,
            queue: songs,
            lastQueueIndex: 0,
            currentSong: songs[0],
            isPlaying: true,
            // Mark as user queue so feed never overwrites this
            queueSource: 'user',
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

    // FIX #6: Returns 'restart' signal when position > 3s so context can seek to 0
    playPrevious: (currentPosition: number = 0): 'restart' | 'previous' => {
        const { queue, lastQueueIndex, repeatMode, currentSong } = playerStore.state;

        // If more than 3 seconds in — restart current song
        if (currentPosition > 3) {
            playerStore.setState((s) => ({ ...s, isPlaying: true }));
            return 'restart';
        }

        if (queue.length === 0) return 'restart';

        const prevIndex = lastQueueIndex - 1;

        if (prevIndex >= 0) {
            const prevSong = queue[prevIndex];
            playerActions.setCurrentSong(prevSong);
            musicApi.addView(prevSong.id).catch(() => { });
        } else if (repeatMode === 'all' && queue.length > 0) {
            const lastSong = queue[queue.length - 1];
            playerActions.setCurrentSong(lastSong);
            musicApi.addView(lastSong.id).catch(() => { });
        } else {
            // At the beginning and no repeat — restart current
            playerStore.setState((s) => ({ ...s, isPlaying: true }));
            return 'restart';
        }

        return 'previous';
    },

    playNext: async () => {
        const { queue, lastQueueIndex, isShuffle, repeatMode, currentSong } = playerStore.state;

        if (repeatMode === 'one' && currentSong) {
            playerStore.setState((s) => ({ ...s, isPlaying: true }));
            return;
        }

        let nextIndex = lastQueueIndex + 1;
        if (lastQueueIndex === -1 && queue.length > 0) {
            nextIndex = 0;
        }

        // FIX #7: Shuffle excludes current song index
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
            musicApi.addView(nextSong.id).catch(() => { });
        } else if (repeatMode === 'all' && queue.length > 0) {
            const nextSong = queue[0];
            playerActions.setCurrentSong(nextSong);
            musicApi.addView(nextSong.id).catch(() => { });
        } else {
            // Queue exhausted and feed not loaded yet.
            // Pull ONE song from the fallback pool as a placeholder.
            // When feed arrives it will replace the queue and take over.
            await playerActions.playNextFromFallback();
        }

        // Trigger feed fetch if nearing end of queue (2 songs remaining)
        const finalQueue = playerStore.state.queue;
        const finalIdx = playerStore.state.lastQueueIndex;
        const remaining = finalQueue.length - finalIdx - 1;
        if (finalQueue.length > 0 && remaining <= 2) {
            playerActions.fetchAndAddFeedToQueue();
        }
    },

    // Fallback pool — songs fetched from /songs endpoint when feed is not ready.
    // Capped at 2 songs total to avoid flooding the queue with non-personalised content.
    // Each call to this pops ONE song from the pool so rapid next-clicks
    // each get exactly one placeholder, not a burst of 10.
    _fallbackPool: [] as PlayerSong[],
    _fallbackPoolFetched: false,
    _fallbackPoolFetching: false,

    playNextFromFallback: async () => {
        const actions = playerActions as any;
        const existingIds = new Set(playerStore.state.queue.map((s) => s.id));

        // Fetch the pool once — max 2 songs, not already in queue
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
                    // Only keep 2 non-duplicate songs as the fallback pool
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

        // Pop one song from the pool
        const pool: PlayerSong[] = actions._fallbackPool;
        const nextFallback = pool.find((s) => !existingIds.has(s.id));

        if (nextFallback) {
            // Remove it from pool so the next rapid click gets a different song
            actions._fallbackPool = pool.filter((s: PlayerSong) => s.id !== nextFallback.id);

            playerStore.setState((state) => ({
                ...state,
                queue: [...state.queue, nextFallback],
                currentSong: nextFallback,
                isPlaying: true,
                lastQueueIndex: state.queue.length,
                // On fallback — allow feed to take over when it arrives
                queueSource: 'feed',
            }));
            musicApi.addView(nextFallback.id).catch(() => { });
        }
        // If pool is empty and feed still not loaded — do nothing, stay on current song
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

                    // Replace any fallback placeholder songs still ahead of the
                    // current position with feed songs.
                    // Songs already played (index <= lastQueueIndex) are kept as history.
                    const played = state.queue.slice(0, state.lastQueueIndex + 1);
                    const actions = playerActions as any;
                    const fallbackIds = new Set(
                        (actions._fallbackPool as PlayerSong[]).map((s: PlayerSong) => s.id)
                    );

                    // Keep songs ahead that are NOT fallback placeholders
                    const keptAhead = state.queue
                        .slice(state.lastQueueIndex + 1)
                        .filter((s) => !fallbackIds.has(s.id));

                    const merged = [...played, ...keptAhead, ...freshFeedSongs];

                    // Reset fallback pool now that feed is loaded
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