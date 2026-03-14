import { Store } from '@tanstack/react-store';
import { musicApi } from './api';
import { getCoverImageUrl } from './s3';

let _storeDbgSeq = 0;
const SDBG = (label: string, ...args: any[]) =>
  console.log(`[🎵 STORE #${++_storeDbgSeq}] ${label}`, ...args);

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
        SDBG('setCurrentSong', { song: song?.title ?? null, currentSong: playerStore.state.currentSong?.title ?? null });
        playerStore.setState((state) => {
            let newLastQueueIndex = state.lastQueueIndex;
            if (song) {
                const idx = state.queue.findIndex((s) => s.id === song.id);
                if (idx !== -1) newLastQueueIndex = idx;
            }

            if (state.currentSong?.id === song?.id && song !== null) {
                SDBG('setCurrentSong: same song, only updating index', { newLastQueueIndex });
                return { ...state, lastQueueIndex: newLastQueueIndex };
            }

            SDBG('setCurrentSong: new song', { title: song?.title, newLastQueueIndex, isPlaying: false });
            return {
                ...state,
                currentSong: song,
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
        SDBG('playSong', { title: song.title, id: song.id });
        playerStore.setState((state) => {
            const existingIdx = state.queue.findIndex((s) => s.id === song.id);

            if (existingIdx !== -1) {
                SDBG('playSong: found in queue at idx', existingIdx);
                return {
                    ...state,
                    currentSong: song,
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
            SDBG('playSong: inserted at idx', insertAt, 'queueLen:', newQueue.length);

            return {
                ...state,
                queue: newQueue,
                currentSong: song,
                isPlaying: false,
                lastQueueIndex: insertAt,
            };
        });
        musicApi.addView(song.id).catch(() => {});
    },

    playAll: (songs: PlayerSong[]) => {
        SDBG('playAll', { count: songs.length, first: songs[0]?.title });
        if (songs.length === 0) return;
        playerStore.setState((state) => ({
            ...state,
            queue: songs,
            lastQueueIndex: 0,
            currentSong: songs[0],
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
            SDBG('setIsPlaying', { from: state.isPlaying, to: isPlaying, song: state.currentSong?.title });
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
        SDBG('playNext', { currentSong: currentSong?.title, lastQueueIndex, queueLen: queue.length, repeatMode, isShuffle });

        if (repeatMode === 'one' && currentSong) {
            SDBG('playNext: repeat-one, restarting');
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

        SDBG('playNext: computed nextIndex', { nextIndex, queueLen: queue.length });

        if (nextIndex >= 0 && nextIndex < queue.length) {
            const nextSong = queue[nextIndex];
            SDBG('playNext: playing', { title: nextSong.title, nextIndex });
            playerActions.setCurrentSong(nextSong);
            musicApi.addView(nextSong.id).catch(() => {});
        } else if (repeatMode === 'all' && queue.length > 0) {
            const nextSong = queue[0];
            SDBG('playNext: repeat-all wrap to 0', { title: nextSong.title });
            playerActions.setCurrentSong(nextSong);
            musicApi.addView(nextSong.id).catch(() => {});
        } else {
            SDBG('playNext: falling back to playNextFromFallback');
            await playerActions.playNextFromFallback();
        }

        const finalQueue = playerStore.state.queue;
        const finalIdx = playerStore.state.lastQueueIndex;
        const remaining = finalQueue.length - finalIdx - 1;
        if (finalQueue.length > 0 && remaining <= 2) {
            SDBG('playNext: low remaining songs, fetching feed', { remaining });
            playerActions.fetchAndAddFeedToQueue();
        }
    },

    _fallbackPage: 1,
    _fallbackFetching: false,

    playNextFromFallback: async () => {
        const actions = playerActions as any;
        if (actions._fallbackFetching) {
            SDBG('playNextFromFallback: already fetching, skipping');
            return;
        }

        actions._fallbackFetching = true;

        try {
            const existingIds = new Set(playerStore.state.queue.map((s) => s.id));
            let nextSong: PlayerSong | undefined;
            
            // Try fetching up to 3 pages to find a non-duplicate
            for (let i = 0; i < 3; i++) {
                SDBG(`playNextFromFallback: fetching page ${actions._fallbackPage}`);
                const res = await musicApi.getSongs(actions._fallbackPage, 5);
                
                if (res?.data && res.data.length > 0) {
                    const mapped: PlayerSong[] = res.data.map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        artistName: s.artistName,
                        storageKey: s.storageKey,
                        coverUrl: getCoverImageUrl(s.storageKey, 'large', true) || null,
                    }));

                    nextSong = mapped.find((s) => !existingIds.has(s.id));
                    
                    if (nextSong) {
                        break;
                    } else {
                        SDBG('playNextFromFallback: all duplicates, advancing page');
                        actions._fallbackPage++;
                    }
                } else {
                    SDBG('playNextFromFallback: no more songs from API');
                    break;
                }
            }

            if (nextSong) {
                SDBG('playNextFromFallback: playing', { title: nextSong.title });
                playerStore.setState((state) => ({
                    ...state,
                    queue: [...state.queue, nextSong!],
                    currentSong: nextSong!,
                    isPlaying: false,
                    lastQueueIndex: state.queue.length,
                    queueSource: 'feed',
                }));
                musicApi.addView(nextSong.id).catch(() => {});
                actions._fallbackPage++; // Advance for the next call
            } else {
                SDBG('playNextFromFallback: failed to find a unique song');
            }
        } catch (err) {
            console.warn('Fallback fetch failed:', err);
        } finally {
            actions._fallbackFetching = false;
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
                    const keptAhead = state.queue.slice(state.lastQueueIndex + 1);
                    const merged = [...played, ...keptAhead, ...freshFeedSongs];

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