import { Store } from '@tanstack/react-store'

export interface Song {
    id: string
    title: string
    artist: string
    coverImageUrl: string
    songBaseUrl: string
    storageKey?: string
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
        playerStore.setState((state) => ({
            ...state,
            currentSong: song,
            isPlaying: !!song,
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
    playNext: () => {
        const { currentSong, queue, isShuffle, repeatMode } = playerStore.state
        if (!currentSong || queue.length === 0) return

        if (repeatMode === 'one') {
            // Restart same song — trigger re-render by re-setting
            playerStore.setState((state) => ({
                ...state,
                currentTime: 0,
                isPlaying: true,
            }))
            return
        }

        const currentIndex = queue.findIndex((s) => s.id === currentSong.id)

        if (isShuffle) {
            const randomIndex = Math.floor(Math.random() * queue.length)
            playerActions.setCurrentSong(queue[randomIndex])
            return
        }

        if (currentIndex !== -1 && currentIndex < queue.length - 1) {
            playerActions.setCurrentSong(queue[currentIndex + 1])
        } else if (repeatMode === 'all' && queue.length > 0) {
            playerActions.setCurrentSong(queue[0])
        }
        // else: end of queue, do nothing
    },
    playPrevious: () => {
        const { currentSong, queue, currentTime } = playerStore.state
        if (!currentSong) return

        // If more than 3 seconds in, restart current song
        if (currentTime > 3) {
            playerStore.setState((state) => ({ ...state, currentTime: 0, isPlaying: true }))
            return
        }

        if (queue.length === 0) return
        const currentIndex = queue.findIndex((s) => s.id === currentSong.id)
        if (currentIndex > 0) {
            playerActions.setCurrentSong(queue[currentIndex - 1])
        }
    },
}