import { Store } from '@tanstack/react-store'
import { musicApi } from '@/lib/api'
import { mapListToPlayerSongs, mapToPlayerSong } from '@/lib/player-utils'

export interface Song {
    id: string
    title: string
    artist: string
    coverImageUrl: string
    songBaseUrl: string
    storageKey?: string
    isLiked?: boolean
}

interface PlayerState {
    currentSong: Song | null
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    isMuted: boolean
    queue: Song[]
    isShuffle: boolean
    repeatMode: 'none' | 'one' | 'all'
    lastQueueIndex: number
}

export const playerStore = new Store<PlayerState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isMuted: false,
    queue: [],
    isShuffle: false,
    repeatMode: 'none',
    lastQueueIndex: -1,
})

export const playerActions = {
    setCurrentSong: (song: Song | null) => {
        playerStore.setState((state) => {
            let newLastQueueIndex = state.lastQueueIndex
            if (song) {
                const idx = state.queue.findIndex(s => s.id === song.id)
                if (idx !== -1) newLastQueueIndex = idx
            }
            if (state.currentSong?.id === song?.id && song !== null) {
                return { ...state, isPlaying: true, lastQueueIndex: newLastQueueIndex }
            }
            return {
                ...state,
                currentSong: song,
                isPlaying: !!song,
                currentTime: 0,
                duration: 0,
                lastQueueIndex: newLastQueueIndex
            }
        })
    },

    playSong: (song: Song) => {
        playerActions.setCurrentSong(song)
    },

    playAll: (songs: Song[]) => {
        if (songs.length === 0) return
        playerStore.setState(state => ({ ...state, queue: songs }))
        playerActions.setCurrentSong(songs[0])
    },

    /**
     * Called once on app load from your root layout or provider.
     * Fetches history, sets the last played song as currentSong (not playing).
     * Does not touch the queue — feed will fill that separately.
     */
    restoreFromHistory: async () => {
        try {
            const history = await musicApi.getHistory(1, 1)
            if (history?.data && history.data.length > 0) {
                const lastPlayedRecord = history.data[0]
                const lastPlayedSong = lastPlayedRecord.song ? mapToPlayerSong(lastPlayedRecord.song) : null

                if (lastPlayedSong) {
                    playerStore.setState(state => ({
                        ...state,
                        currentSong: lastPlayedSong,
                        isPlaying: false,
                        currentTime: 0,
                        duration: 0,
                    }))
                }
            }
        } catch (error) {
            console.error('Failed to restore history:', error)
        }
    },

    /**
     * Called from HomeFeed when fresh feed data arrives.
     * Replaces queue with feed songs and resets lastQueueIndex to -1.
     * Current song is untouched — it stays in the player, not playing.
     * When user hits next, currentSong won't be in the new queue and
     * lastQueueIndex is -1, so playNext() starts from queue[0] = feed[0].
     */
    syncFeedToQueue: (feedSongs: Song[]) => {
        playerStore.setState(state => ({
            ...state,
            queue: feedSongs,
            lastQueueIndex: -1,
        }))
    },

    fetchAndAddFeedToQueue: async () => {
        try {
            const feedData = await musicApi.getFeed()
            if (feedData && feedData.data) {
                const newSongs = mapListToPlayerSongs(feedData.data)
                playerStore.setState(state => {
                    const existingIds = new Set(state.queue.map(s => s.id))
                    const filteredNewSongs = newSongs.filter(s => !existingIds.has(s.id))
                    return { ...state, queue: [...state.queue, ...filteredNewSongs] }
                })
                return newSongs
            }
        } catch (error) {
            console.error('Failed to fetch feed:', error)
        }
        return []
    },

    hydrateSong: (song: Song | null) => {
        playerStore.setState((state) => ({
            ...state,
            currentSong: song,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
        }))
    },

    setIsPlaying: (isPlaying: boolean) => {
        playerStore.setState((state) => ({ ...state, isPlaying }))
    },

    setCurrentTime: (currentTime: number) => {
        playerStore.setState((state) => ({ ...state, currentTime }))
    },

    setDuration: (duration: number) => {
        playerStore.setState((state) => ({ ...state, duration }))
    },

    setVolume: (volume: number) => {
        playerStore.setState((state) => ({ ...state, volume: Math.max(0, Math.min(1, volume)) }))
    },

    setIsMuted: (isMuted: boolean) => {
        playerStore.setState((state) => ({ ...state, isMuted }))
    },

    setQueue: (queue: Song[]) => {
        playerStore.setState((state) => ({ ...state, queue }))
    },

    toggleShuffle: () => {
        playerStore.setState((state) => ({ ...state, isShuffle: !state.isShuffle }))
    },

    toggleRepeat: () => {
        playerStore.setState((state) => {
            const next: Record<string, 'none' | 'one' | 'all'> = { none: 'all', all: 'one', one: 'none' }
            return { ...state, repeatMode: next[state.repeatMode] }
        })
    },

    playNext: async () => {
        const { queue, lastQueueIndex, isShuffle, repeatMode, currentSong } = playerStore.state

        if (queue.length === 0) return

        if (repeatMode === 'one' && currentSong) {
            playerStore.setState((state) => ({ ...state, currentTime: 0, isPlaying: true }))
            return
        }

        let nextIndex = lastQueueIndex + 1

        if (isShuffle && queue.length > 0) {
            nextIndex = Math.floor(Math.random() * queue.length)
        }

        if (nextIndex < queue.length) {
            playerActions.setCurrentSong(queue[nextIndex])
        } else if (repeatMode === 'all' && queue.length > 0) {
            playerActions.setCurrentSong(queue[0])
        }
    },

    playPrevious: () => {
        const { queue, lastQueueIndex, currentTime, repeatMode } = playerStore.state
        if (queue.length === 0) return

        if (currentTime > 3) {
            playerStore.setState((state) => ({ ...state, currentTime: 0, isPlaying: true }))
            return
        }

        let prevIndex = lastQueueIndex - 1

        if (prevIndex >= 0) {
            playerActions.setCurrentSong(queue[prevIndex])
        } else if (repeatMode === 'all' && queue.length > 0) {
            playerActions.setCurrentSong(queue[queue.length - 1])
        } else {
            playerStore.setState((state) => ({ ...state, currentTime: 0, isPlaying: true }))
        }
    },

    toggleFavourite: () => {
        playerStore.setState((state) => {
            if (!state.currentSong) return state
            return {
                ...state,
                currentSong: { ...state.currentSong, isLiked: !state.currentSong.isLiked },
            }
        })
    },
}