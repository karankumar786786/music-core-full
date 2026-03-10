import { Store } from '@tanstack/react-store'
import { musicApi } from '@/lib/api'
import { mapListToPlayerSongs } from '@/lib/player-utils'

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
})

export const playerActions = {
    setCurrentSong: (song: Song | null) => {
        playerStore.setState((state) => {
            if (state.currentSong?.id === song?.id && song !== null) {
                return { ...state, isPlaying: true }
            }
            return {
                ...state,
                currentSong: song,
                isPlaying: !!song,
                currentTime: 0,
                duration: 0,
            }
        })
    },
    playSong: (song: Song) => {
        const { queue, currentSong } = playerStore.state
        const indexInQueue = queue.findIndex(s => s.id === song.id)

        if (indexInQueue !== -1) {
            // Song already in queue, just play it
            playerActions.setCurrentSong(song)
        } else {
            // Insert after current song or at end if no current song
            const currentIndex = currentSong ? queue.findIndex(s => s.id === currentSong.id) : -1
            const newQueue = [...queue]
            if (currentIndex !== -1) {
                newQueue.splice(currentIndex + 1, 0, song)
            } else {
                newQueue.push(song)
            }
            playerStore.setState(state => ({ ...state, queue: newQueue }))
            playerActions.setCurrentSong(song)
        }
    },
    fetchAndAddFeedToQueue: async () => {
        try {
            const feedData = await musicApi.getFeed()
            if (feedData && feedData.data) {
                const newSongs = mapListToPlayerSongs(feedData.data)
                playerStore.setState(state => ({
                    ...state,
                    queue: [...state.queue, ...newSongs]
                }))
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
        const { currentSong, queue, isShuffle, repeatMode } = playerStore.state

        if (queue.length === 0) {
            const newSongs = await playerActions.fetchAndAddFeedToQueue()
            if (newSongs.length > 0) {
                playerActions.setCurrentSong(newSongs[0])
            }
            return
        }

        if (repeatMode === 'one' && currentSong) {
            playerStore.setState((state) => ({
                ...state,
                currentTime: 0,
                isPlaying: true,
            }))
            return
        }

        const currentIndex = currentSong ? queue.findIndex((s) => s.id === currentSong.id) : -1

        if (isShuffle && queue.length > 1) {
            let randomIndex = Math.floor(Math.random() * queue.length)
            // Try not to pick the same song
            while (currentIndex !== -1 && randomIndex === currentIndex && queue.length > 1) {
                randomIndex = Math.floor(Math.random() * queue.length)
            }
            playerActions.setCurrentSong(queue[randomIndex])
            return
        }

        if (currentIndex !== -1 && currentIndex < queue.length - 1) {
            playerActions.setCurrentSong(queue[currentIndex + 1])
        } else if (repeatMode === 'all' && queue.length > 0) {
            playerActions.setCurrentSong(queue[0])
        } else {
            // End of queue, try fetching more from feed
            const newSongs = await playerActions.fetchAndAddFeedToQueue()
            if (newSongs.length > 0) {
                playerActions.setCurrentSong(newSongs[0])
            } else if (repeatMode === 'all') {
                playerActions.setCurrentSong(queue[0])
            }
        }
    },
    playPrevious: () => {
        const { currentSong, queue, currentTime, repeatMode } = playerStore.state
        if (!currentSong || queue.length === 0) return

        if (currentTime > 3) {
            playerStore.setState((state) => ({ ...state, currentTime: 0, isPlaying: true }))
            return
        }

        const currentIndex = queue.findIndex((s) => s.id === currentSong.id)
        if (currentIndex > 0) {
            playerActions.setCurrentSong(queue[currentIndex - 1])
        } else if (repeatMode === 'all') {
            playerActions.setCurrentSong(queue[queue.length - 1])
        } else {
            // Restart current song if at the very beginning and no repeat all
            playerStore.setState((state) => ({ ...state, currentTime: 0, isPlaying: true }))
        }
    },
    toggleFavourite: () => {
        playerStore.setState((state) => {
            if (!state.currentSong) return state
            return {
                ...state,
                currentSong: {
                    ...state.currentSong,
                    isLiked: !state.currentSong.isLiked,
                },
            }
        })
    },
}