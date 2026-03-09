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
}

export const playerStore = new Store<PlayerState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isMuted: false,
    queue: [],
})

export const playerActions = {
    setCurrentSong: (song: Song | null) => {
        playerStore.setState((state) => ({
            ...state,
            currentSong: song,
            isPlaying: !!song,
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
        playerStore.setState((state) => ({ ...state, volume }))
    },
    setIsMuted: (isMuted: boolean) => {
        playerStore.setState((state) => ({ ...state, isMuted }))
    },
    setQueue: (queue: Song[]) => {
        playerStore.setState((state) => ({ ...state, queue }))
    },
    playNext: () => {
        const { currentSong, queue } = playerStore.state
        if (!currentSong || queue.length === 0) return
        const currentIndex = queue.findIndex((s) => s.id === currentSong.id)
        if (currentIndex !== -1 && currentIndex < queue.length - 1) {
            playerActions.setCurrentSong(queue[currentIndex + 1])
        }
    },
    playPrevious: () => {
        const { currentSong, queue } = playerStore.state
        if (!currentSong || queue.length === 0) return
        const currentIndex = queue.findIndex((s) => s.id === currentSong.id)
        if (currentIndex > 0) {
            playerActions.setCurrentSong(queue[currentIndex - 1])
        }
    },
}
