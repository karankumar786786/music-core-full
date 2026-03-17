import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { router } from 'expo-router';
import { useVideoPlayer } from 'expo-video';
import { useStore } from '@tanstack/react-store';
import { getSongBaseUrl } from './s3';
import { useAuth } from './auth';
import { playerStore, playerActions, PlayerSong } from './player-store';
export { PlayerSong };

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerStateContextType {
  currentSong: PlayerSong | null;
  isPlaying: boolean;
  isBuffering: boolean;
  baseUrl: string;
  queue: PlayerSong[];
  isShuffle: boolean;
  repeatMode: 'none' | 'one' | 'all';
}

interface PlayerActionsContextType {
  play: (song: PlayerSong) => void;
  playAll: (songs: PlayerSong[]) => void;
  addToQueue: (songs: PlayerSong[]) => void;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  stop: () => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setIsPlaying: (playing: boolean) => void;
}

interface PlayerProgressContextType {
  position: number;
  bufferedPosition: number;
  duration: number;
}

type PlayerContextType = PlayerStateContextType & PlayerActionsContextType;

// ─── Contexts ─────────────────────────────────────────────────────────────────

const PlayerStateContext = createContext<PlayerStateContextType | null>(null);
const PlayerActionsContext = createContext<PlayerActionsContextType | null>(null);
const PlayerProgressContext = createContext<PlayerProgressContextType | null>(null);
const PlayerContext = createContext<PlayerContextType | null>(null);

// ─── Helper ───────────────────────────────────────────────────────────────────

function getMp3Url(song: PlayerSong): string {
  const baseUrl = getSongBaseUrl(song.storageKey) || song.songBaseUrl;
  if (!baseUrl) return '';
  return `${baseUrl}/audio.mp3`;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const currentSong    = useStore(playerStore, (s) => s.currentSong);
  const lastQueueIndex = useStore(playerStore, (s) => s.lastQueueIndex);
  const isShuffle      = useStore(playerStore, (s) => s.isShuffle);
  const repeatMode     = useStore(playerStore, (s) => s.repeatMode);
  const isPlayingStore = useStore(playerStore, (s) => s.isPlaying);
  const queue          = useStore(playerStore, (s) => s.queue);

  const { isAuthenticated } = useAuth();

  const player = useVideoPlayer('', (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
  });

  const [position, setPosition]                 = useState(0);
  const [bufferedPosition, setBufferedPosition] = useState(0);
  const [duration, setDuration]                 = useState(0);
  const [isBuffering, setIsBuffering]           = useState(false);

  const loadedSongIdRef    = useRef<string | null>(null);
  const shouldAutoPlayRef  = useRef(false);
  const isLoadingRef       = useRef(false);
  const lastSeekTimeRef    = useRef(0);
  const positionRef        = useRef(0);
  const isPlayingStoreRef  = useRef(isPlayingStore);

  // ── NEW: seeking guard refs ───────────────────────────────────────────────
  const isSeekingRef       = useRef(false);
  const seekTimeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync so event listeners always see latest value
  useEffect(() => {
    isPlayingStoreRef.current = isPlayingStore;
  }, [isPlayingStore]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (isAuthenticated) playerActions.restoreFromHistory();
  }, [isAuthenticated]);

  // ── Load song & honour play/pause ─────────────────────────────────────────

  useEffect(() => {
    let isCurrent = true;

    const sync = async () => {
      if (!currentSong) {
        player.pause();
        return;
      }

      const url = getMp3Url(currentSong);
      if (!url) return;

      const songChanged = loadedSongIdRef.current !== currentSong.id;

      if (songChanged) {
        isLoadingRef.current = true;
        loadedSongIdRef.current = currentSong.id;

        try {
          await player.replaceAsync(url);
          if (!isCurrent) return;

          if (shouldAutoPlayRef.current || isPlayingStore) {
            playerActions.setIsPlaying(true);
            player.play();
          }
        } catch (err) {
          console.error('[Player] replaceAsync failed:', err);
        } finally {
          if (isCurrent) isLoadingRef.current = false;
        }
      } else {
        // Same song — just sync play/pause
        if (isPlayingStore) {
          if (!player.playing) player.play();
        } else {
          if (player.playing) player.pause();
        }
      }

      shouldAutoPlayRef.current = false;
    };

    sync();
    return () => { isCurrent = false; };
  }, [currentSong, lastQueueIndex, isShuffle, repeatMode, isPlayingStore]);

  // ── Player events ─────────────────────────────────────────────────────────

  useEffect(() => {
    // Seed initial values
    setIsBuffering(player.status === 'loading');
    setDuration(player.duration);
    setPosition(player.currentTime);
    setBufferedPosition(player.bufferedPosition);

    const statusSub = player.addListener('statusChange', ({ status }) => {
      setIsBuffering(status === 'loading');
    });

    const playSub = player.addListener('playingChange', ({ isPlaying: nativePlaying }) => {
      // Ignore spurious pause events fired during loading or seeking
      if (isLoadingRef.current) return;
      if (isSeekingRef.current) return;

      if (nativePlaying !== playerStore.state.isPlaying) {
        playerActions.setIsPlaying(nativePlaying);
      }
    });

    const timeSub = player.addListener(
      'timeUpdate',
      ({ currentTime, bufferedPosition: newBuffered }) => {
        if (Date.now() - lastSeekTimeRef.current > 500) {
          setPosition(currentTime);
        }
        setBufferedPosition(newBuffered ?? player.bufferedPosition);
        setDuration(player.duration);
      }
    );

    const sourceSub = player.addListener('sourceLoad', () => {
      setDuration(player.duration);
    });

    const endSub = player.addListener('playToEnd', () => {
      shouldAutoPlayRef.current = true;
      playerActions.playNext();
    });

    return () => {
      statusSub.remove();
      playSub.remove();
      timeSub.remove();
      sourceSub.remove();
      endSub.remove();
      // Clean up any pending seek timeout
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    };
  }, [player]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const seekTo = useCallback((seconds: number) => {
    setPosition(seconds);
    lastSeekTimeRef.current = Date.now();

    // Block playingChange interference during and just after seeking
    isSeekingRef.current = true;
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      isSeekingRef.current = false;
    }, 800);

    try {
      player.currentTime = seconds;
    } catch {
      try { player.seekBy(seconds - player.currentTime); } catch {}
    }
  }, [player]);

  const play = useCallback((song: PlayerSong) => {
    shouldAutoPlayRef.current = true;
    playerActions.playSong(song);
    router.navigate('/player');
  }, []);

  const playAll = useCallback((songs: PlayerSong[]) => {
    if (!songs.length) return;
    shouldAutoPlayRef.current = true;
    playerActions.playAll(songs);
    router.navigate('/player');
  }, []);

  const stop = useCallback(() => {
    player.pause();
    playerActions.setCurrentSong(null);
  }, [player]);

  const playPrevious = useCallback(() => {
    shouldAutoPlayRef.current = true;
    const result = playerActions.playPrevious(positionRef.current);
    if (result === 'restart') {
      seekTo(0);
      playerActions.setIsPlaying(true);
      player.play();
    }
  }, [seekTo, player]);

  // ── Context values ────────────────────────────────────────────────────────

  const actionsValue = useMemo<PlayerActionsContextType>(() => ({
    play,
    playAll,
    addToQueue: (songs) => playerActions.addToQueue(songs),
    togglePlayPause: () => {
      const willPlay = !playerStore.state.isPlaying;
      if (willPlay) shouldAutoPlayRef.current = true;
      playerActions.setIsPlaying(willPlay);
    },
    seekTo,
    stop,
    playNext: () => {
      shouldAutoPlayRef.current = true;
      playerActions.playNext();
    },
    playPrevious,
    toggleShuffle: () => playerActions.toggleShuffle(),
    toggleRepeat:  () => playerActions.toggleRepeat(),
    setIsPlaying:  (p) => playerActions.setIsPlaying(p),
  }), [play, playAll, seekTo, stop, playPrevious]);

  const stateValue = useMemo<PlayerStateContextType>(() => ({
    currentSong,
    isPlaying: isPlayingStore,
    isBuffering,
    baseUrl: currentSong
      ? getSongBaseUrl(currentSong.storageKey) || currentSong.songBaseUrl || ''
      : '',
    queue,
    isShuffle,
    repeatMode,
  }), [currentSong, isPlayingStore, isBuffering, queue, isShuffle, repeatMode]);

  const progressValue = useMemo<PlayerProgressContextType>(
    () => ({ position, bufferedPosition, duration }),
    [position, bufferedPosition, duration]
  );

  const legacyValue = useMemo<PlayerContextType>(
    () => ({ ...stateValue, ...actionsValue }),
    [stateValue, actionsValue]
  );

  return (
    <PlayerActionsContext.Provider value={actionsValue}>
      <PlayerStateContext.Provider value={stateValue}>
        <PlayerProgressContext.Provider value={progressValue}>
          <PlayerContext.Provider value={legacyValue}>
            {children}
          </PlayerContext.Provider>
        </PlayerProgressContext.Provider>
      </PlayerStateContext.Provider>
    </PlayerActionsContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const usePlayerActions = () => {
  const ctx = useContext(PlayerActionsContext);
  if (!ctx) throw new Error('usePlayerActions must be used within a PlayerProvider');
  return ctx;
};

export const usePlayerState = () => {
  const ctx = useContext(PlayerStateContext);
  if (!ctx) throw new Error('usePlayerState must be used within a PlayerProvider');
  return ctx;
};

export const usePlayerProgress = () => {
  const ctx = useContext(PlayerProgressContext);
  if (!ctx) throw new Error('usePlayerProgress must be used within a PlayerProvider');
  return ctx;
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
};