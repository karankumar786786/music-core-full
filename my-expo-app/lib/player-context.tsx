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
import { useVideoPlayer, VideoTrack } from 'expo-video';
import { useStore } from '@tanstack/react-store';
import { getSongBaseUrl } from './s3';
import { parseMasterM3U8 } from './hls';
import { useAuth } from './auth';
import { playerStore, playerActions, PlayerSong } from './player-store';
export { PlayerSong };

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerStateContextType {
  currentSong: PlayerSong | null;
  isPlaying: boolean;
  isBuffering: boolean;
  baseUrl: string;
  activeTrack: VideoTrack | null;
  availableTracks: VideoTrack[];
  currentQualityType: 'auto' | 'high' | 'med' | 'low';
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
  setQualityType: (type: 'auto' | 'high' | 'med' | 'low') => void;
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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  // ── Store subscriptions ───────────────────────────────────────────────────
  const currentSong = useStore(playerStore, (s) => s.currentSong);
  const lastQueueIndex = useStore(playerStore, (s) => s.lastQueueIndex);
  const isShuffle = useStore(playerStore, (s) => s.isShuffle);
  const repeatMode = useStore(playerStore, (s) => s.repeatMode);
  const isPlayingStore = useStore(playerStore, (s) => s.isPlaying);
  const queue = useStore(playerStore, (s) => s.queue);

  const { isAuthenticated } = useAuth();

  const initPlayer = (p: any) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.05;
    p.bufferOptions = { preferredForwardBufferDuration: 20 };
  };

  const p0 = useVideoPlayer('', initPlayer);
  const p1 = useVideoPlayer('', initPlayer);

  const [activePlayerIndex, setActivePlayerIndex] = useState<0 | 1>(0);
  const player = activePlayerIndex === 0 ? p0 : p1;

  const [position, setPosition] = useState(0);
  const [bufferedPosition, setBufferedPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [activeTrack, setActiveTrack] = useState<VideoTrack | null>(null);
  const [availableTracks, setAvailableTracks] = useState<VideoTrack[]>([]);
  const [qualityType, setQualityType] = useState<'auto' | 'high' | 'med' | 'low'>('auto');

  const shouldAutoPlayRef = useRef(false);
  const isSourceLoadingRef = useRef(false);
  const lastPlayCommandTimeRef = useRef<number>(0);
  const lastSeekTimeRef = useRef<number>(0);
  const standbyReadyRef = useRef(false);
  const standbyLoadIdRef = useRef(0);
  const positionRef = useRef(0);
  // Brief guard: set true right before setActivePlayerIndex in the swap path,
  // cleared once the new activePlayerIndex render has committed.
  // Only used by playingChange listener to ignore stale events from old player.
  const swappingRef = useRef(false);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (isAuthenticated) {
      playerActions.restoreFromHistory();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    
    isSourceLoadingRef.current = false;
    swappingRef.current = false;
  }, [activePlayerIndex]);

  // ── Stream URL Resolution ─────────────────────────────────────────────────

  const streamUrlCacheRef = useRef<Record<string, string>>({});

  const resolveStreamUrl = useCallback(async (song: PlayerSong, targetQuality: string) => {
    const cacheKey = `${song.id}-${targetQuality}`;
    if (streamUrlCacheRef.current[cacheKey]) return streamUrlCacheRef.current[cacheKey];

    const baseUrl = getSongBaseUrl(song.storageKey) || song.songBaseUrl;
    if (!baseUrl) return '';
    const masterUrl = `${baseUrl}/master.m3u8`;
    if (targetQuality === 'auto') return masterUrl;

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', masterUrl);
        xhr.timeout = 10000;
        xhr.setRequestHeader('Accept', '*/*');
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve(xhr.responseText)
            : reject(new Error(`HTTP ${xhr.status}`));
        xhr.onerror = () => reject(new Error('XHR error'));
        xhr.ontimeout = () => reject(new Error('XHR timeout'));
        xhr.send();
      });

      const variants = parseMasterM3U8(text);
      if (variants.length === 0) return masterUrl;

      const sorted = [...variants].sort((a, b) => b.bandwidth - a.bandwidth);
      let targetVariant = sorted[0];
      if (targetQuality === 'med') targetVariant = sorted[Math.floor(sorted.length / 2)];
      if (targetQuality === 'low') targetVariant = sorted[sorted.length - 1];

      const streamUrl = targetVariant.uri.startsWith('http')
        ? targetVariant.uri
        : `${baseUrl}/${targetVariant.uri}`;
      streamUrlCacheRef.current[cacheKey] = streamUrl;
      return streamUrl;
    } catch {
      return masterUrl;
    }
  }, []);

  // ── Dual Player Song Tracking ─────────────────────────────────────────────

  const p0SongRef = useRef<{ id: string | null; quality: string | null }>({
    id: null,
    quality: null,
  });
  const p1SongRef = useRef<{ id: string | null; quality: string | null }>({
    id: null,
    quality: null,
  });

  // ── Sync Playback (unified — handles swap + load + play/pause) ────────────
  // This is the SINGLE effect that decides what the active player should do.
  // It inlines the standby-swap logic (previously a separate effect) to avoid
  // cross-effect race conditions.

  useEffect(() => {
    let isCurrent = true;

    const syncPlayback = async () => {
      if (!currentSong) {
        
        p0.pause();
        p1.pause();
        return;
      }

      const activeP = activePlayerIndex === 0 ? p0 : p1;
      const activeRef = activePlayerIndex === 0 ? p0SongRef : p1SongRef;
      const standbyIdx = (activePlayerIndex === 0 ? 1 : 0) as 0 | 1;
      const standbyP = standbyIdx === 0 ? p0 : p1;
      const standbyRef = standbyIdx === 0 ? p0SongRef : p1SongRef;

      const isQualityChange =
        activeRef.current.id === currentSong.id && activeRef.current.quality !== qualityType;
      const needsActiveLoad = activeRef.current.id !== currentSong.id || isQualityChange;



      // ── Fast-path: standby already has this song → instant swap ────────
      if (
        needsActiveLoad &&
        !isQualityChange &&
        !isSourceLoadingRef.current &&
        standbyRef.current.id === currentSong.id &&
        standbyRef.current.quality === qualityType &&
        standbyReadyRef.current
      ) {
        const wasPlaying = shouldAutoPlayRef.current || isPlayingStore;
        

        // Stop old player
        activeP.pause();
        standbyReadyRef.current = false;

        // Start playback on the standby BEFORE flipping the index,
        // so audio starts immediately.
        if (wasPlaying) {
          lastPlayCommandTimeRef.current = Date.now();
          playerActions.setIsPlaying(true);
          standbyP.play();
          
        }

        // Now flip the index. This triggers a re-render:
        //  1. The activePlayerIndex change effect clears swappingRef + isSourceLoading
        //  2. This effect re-runs but activeRef now matches currentSong → needsActiveLoad = false → no-op
        //  3. Event subs effect re-runs and attaches to the new player
        shouldAutoPlayRef.current = false;
        swappingRef.current = true; // guard playingChange events briefly
        setActivePlayerIndex(standbyIdx);
        return;
      }

      // ── Normal path: load the stream on the active player ──────────────
      if (needsActiveLoad) {
        const wasPlaying = shouldAutoPlayRef.current || isPlayingStore;
        

        const streamUrl = await resolveStreamUrl(currentSong, qualityType);
        if (!isCurrent) return;

        const preservedPos = isQualityChange ? activeP.currentTime : 0;
        

        isSourceLoadingRef.current = true;

        try {
          if (isQualityChange) activeP.pause();

          await activeP.replaceAsync(streamUrl);
          if (!isCurrent) return;
          
          activeRef.current = { id: currentSong.id, quality: qualityType };

          if (isQualityChange && preservedPos > 0) {
            setPosition(preservedPos);
            lastSeekTimeRef.current = Date.now();
            try {
              activeP.currentTime = preservedPos;
            } catch {
              try { activeP.seekBy(preservedPos - activeP.currentTime); } catch {}
            }
            await new Promise<void>((resolve) => setTimeout(resolve, 120));
            if (!isCurrent) return;
          }

          if (wasPlaying) {
            lastPlayCommandTimeRef.current = Date.now();
            playerActions.setIsPlaying(true);
            
            activeP.play();
          } else {
            
          }
        } catch (err) {
          console.error('[PlayerContext] replaceAsync FAILED:', err);
          
        } finally {
          if (isCurrent) isSourceLoadingRef.current = false;
        }
      } else {
        // Stream already loaded — just honour play/pause state
        if (shouldAutoPlayRef.current || isPlayingStore) {
          lastPlayCommandTimeRef.current = Date.now();
          playerActions.setIsPlaying(true);
          
          activeP.play();
        } else {
          
          activeP.pause();
        }
      }

      
      shouldAutoPlayRef.current = false;
    };

    syncPlayback();
    return () => {
      isCurrent = false;
    };
  }, [
    currentSong,
    lastQueueIndex,
    isShuffle,
    repeatMode,
    qualityType,
    activePlayerIndex,
    isPlayingStore,
    p0,
    p1,
    resolveStreamUrl,
  ]);

  // ── Standby Preload ───────────────────────────────────────────────────────

  useEffect(() => {
    let isCurrent = true;

    const preloadStandby = async () => {
      if (!currentSong) return;

      const standbyP = activePlayerIndex === 0 ? p1 : p0;
      const standbyRef = activePlayerIndex === 0 ? p1SongRef : p0SongRef;
      const standbyIdx = activePlayerIndex === 0 ? 1 : 0;

      const { queue: currentQueue } = playerStore.state;

      let nextIdx = lastQueueIndex + 1;
      if (isShuffle) {
        nextIdx = (lastQueueIndex + 1) % Math.max(currentQueue.length, 1);
      } else if (nextIdx >= currentQueue.length && repeatMode === 'all') {
        nextIdx = 0;
      }

      const nextSong =
        nextIdx >= 0 && nextIdx < currentQueue.length ? currentQueue[nextIdx] : null;

      if (!nextSong) {
        
        return;
      }

      const needsStandbyLoad =
        standbyRef.current.id !== nextSong.id || standbyRef.current.quality !== qualityType;

      if (!needsStandbyLoad) {
        
        return;
      }

      const loadId = ++standbyLoadIdRef.current;
      

      const streamUrl = await resolveStreamUrl(nextSong, qualityType);
      if (!isCurrent || loadId !== standbyLoadIdRef.current) {
        
        return;
      }

      standbyReadyRef.current = false;
      try {
        await standbyP.replaceAsync(streamUrl);
        if (!isCurrent || loadId !== standbyLoadIdRef.current) {
          
          return;
        }
        standbyRef.current = { id: nextSong.id, quality: qualityType };
        standbyP.pause();
        standbyReadyRef.current = true;
        
      } catch (err) {
        
      }
    };

    preloadStandby();
    return () => {
      isCurrent = false;
    };
  }, [
    currentSong,
    lastQueueIndex,
    isShuffle,
    repeatMode,
    qualityType,
    activePlayerIndex,
    p0,
    p1,
    resolveStreamUrl,
  ]);


  // ── Sync Player Events → State ────────────────────────────────────────────

  useEffect(() => {
    const pIdx = activePlayerIndex;
    

    setIsBuffering(player.status === 'loading');
    setDuration(player.duration);
    setPosition(player.currentTime);
    setBufferedPosition(player.bufferedPosition);
    setActiveTrack(player.videoTrack);
    setAvailableTracks(player.availableVideoTracks || []);

    const statusSub = player.addListener('statusChange', ({ status }) => {
      
      setIsBuffering(status === 'loading');
    });

    const playSub = player.addListener('playingChange', ({ isPlaying: newIsPlaying }) => {
      const timeSincePlayCommand = Date.now() - lastPlayCommandTimeRef.current;
      const isIgnoringFalse = !newIsPlaying && timeSincePlayCommand < 1000;
      const blocked = swappingRef.current || isSourceLoadingRef.current || isIgnoringFalse || player.status === 'loading';



      if (swappingRef.current) return;
      if (
        !isSourceLoadingRef.current &&
        !isIgnoringFalse &&
        player.status !== 'loading' &&
        newIsPlaying !== playerStore.state.isPlaying
      ) {
        
        playerActions.setIsPlaying(newIsPlaying);
      }
    });

    const timeSub = player.addListener(
      'timeUpdate',
      ({ currentTime, bufferedPosition: newBuffered }) => {
        const isRecentlySeeked = Date.now() - lastSeekTimeRef.current < 1000;
        if (!isRecentlySeeked) {
          setPosition(currentTime);
        }
        setBufferedPosition(
          newBuffered !== undefined && newBuffered !== null
            ? newBuffered
            : player.bufferedPosition
        );
        setDuration(player.duration);
      }
    );

    const trackSub = player.addListener('videoTrackChange', ({ videoTrack }) =>
      setActiveTrack(videoTrack)
    );

    const metadataSub = player.addListener('sourceLoad', (payload) => {
      
      setAvailableTracks(payload?.availableVideoTracks || []);
    });

    const endSub = player.addListener('playToEnd', () => {
      
      shouldAutoPlayRef.current = true;
      playerActions.playNext();
    });

    return () => {
      
      statusSub.remove();
      playSub.remove();
      timeSub.remove();
      trackSub.remove();
      metadataSub.remove();
      endSub.remove();
    };
  }, [player]);

  // ── Stable Actions ────────────────────────────────────────────────────────

  const play = useCallback((song: PlayerSong) => {
    
    shouldAutoPlayRef.current = true;
    playerActions.playSong(song);
    router.navigate('/player');
  }, []);

  const playAll = useCallback((songs: PlayerSong[]) => {
    
    if (songs.length === 0) return;
    shouldAutoPlayRef.current = true;
    playerActions.playAll(songs);
    router.navigate('/player');
  }, []);

  const seekTo = useCallback(
    (seconds: number) => {
      setPosition(seconds);
      lastSeekTimeRef.current = Date.now();
      try {
        player.currentTime = seconds;
      } catch {
        try {
          player.seekBy(seconds - player.currentTime);
        } catch {}
      }
    },
    [player]
  );

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

  // ── Context Values ────────────────────────────────────────────────────────

  const actionsValue = useMemo<PlayerActionsContextType>(
    () => ({
      play,
      playAll,
      addToQueue: (songs: PlayerSong[]) => playerActions.addToQueue(songs),
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
      toggleRepeat: () => playerActions.toggleRepeat(),
      setIsPlaying: (p: boolean) => playerActions.setIsPlaying(p),
      setQualityType,
    }),
    [play, playAll, seekTo, stop, playPrevious]
  );

  const stateValue = useMemo<PlayerStateContextType>(
    () => ({
      currentSong,
      isPlaying: isPlayingStore,
      isBuffering,
      baseUrl: currentSong
        ? getSongBaseUrl(currentSong.storageKey) || currentSong.songBaseUrl || ''
        : '',
      activeTrack,
      availableTracks,
      currentQualityType: qualityType,
      queue,
      isShuffle,
      repeatMode,
    }),
    [
      currentSong,
      isPlayingStore,
      isBuffering,
      activeTrack,
      availableTracks,
      qualityType,
      queue,
      isShuffle,
      repeatMode,
    ]
  );

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