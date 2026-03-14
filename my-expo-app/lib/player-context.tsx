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

// ─── Context Types ────────────────────────────────────────────────────────────

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

// Legacy combined type for backwards compat
type PlayerContextType = PlayerStateContextType & PlayerActionsContextType;

// ─── Contexts ─────────────────────────────────────────────────────────────────

const PlayerStateContext = createContext<PlayerStateContextType | null>(null);
const PlayerActionsContext = createContext<PlayerActionsContextType | null>(null);
const PlayerProgressContext = createContext<PlayerProgressContextType | null>(null);
// Legacy context merges state + actions but NOT progress (avoids 50ms re-render cascade)
const PlayerContext = createContext<PlayerContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const state = useStore(playerStore, (s) => s);
  const {
    currentSong,
    queue,
    lastQueueIndex,
    isShuffle,
    repeatMode,
    isPlaying: isPlayingStore,
  } = state;
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
  // Stable ref so playPrevious doesn't need `position` in its deps
  const positionRef = useRef(0);

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
  }, [activePlayerIndex]);

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

  const p0SongRef = useRef<{ id: string | null; quality: string | null }>({
    id: null,
    quality: null,
  });
  const p1SongRef = useRef<{ id: string | null; quality: string | null }>({
    id: null,
    quality: null,
  });

  useEffect(() => {
    if (!currentSong) return;
    const standbyIdx = activePlayerIndex === 0 ? 1 : 0;
    const standbyRef = standbyIdx === 0 ? p0SongRef : p1SongRef;

    if (
      standbyRef.current.id === currentSong.id &&
      standbyRef.current.quality === qualityType &&
      standbyReadyRef.current
    ) {
      standbyReadyRef.current = false;
      setActivePlayerIndex(standbyIdx as 0 | 1);
    }
  }, [currentSong, qualityType, activePlayerIndex]);

  useEffect(() => {
    let isCurrent = true;
    const syncPlayback = async () => {
      if (!currentSong) {
        p0.pause();
        p1.pause();
        return;
      }

      const activeP = activePlayerIndex === 0 ? p0 : p1;
      const standbyP = activePlayerIndex === 0 ? p1 : p0;
      const activeRef = activePlayerIndex === 0 ? p0SongRef : p1SongRef;
      const standbyRef = activePlayerIndex === 0 ? p1SongRef : p0SongRef;

      const isQualityChange =
        activeRef.current.id === currentSong.id && activeRef.current.quality !== qualityType;
      const needsActiveLoad = activeRef.current.id !== currentSong.id || isQualityChange;

      if (needsActiveLoad) {
        const preservedPos = isQualityChange ? activeP.currentTime : 0;
        const streamUrl = await resolveStreamUrl(currentSong, qualityType);
        if (!isCurrent) return;

        isSourceLoadingRef.current = true;
        try {
          await activeP.replaceAsync(streamUrl);
          if (!isCurrent) return;
          activeRef.current = { id: currentSong.id, quality: qualityType };

          if (isQualityChange && preservedPos > 0) {
            try {
              activeP.seekBy(preservedPos - activeP.currentTime);
            } catch {
              activeP.currentTime = preservedPos;
            }
          }

          if (shouldAutoPlayRef.current || isPlayingStore) {
            lastPlayCommandTimeRef.current = Date.now();
            activeP.play();
          }
        } catch (err) {
          console.error('[PlayerContext] replaceAsync FAILED:', err);
        } finally {
          if (isCurrent) {
            isSourceLoadingRef.current = false;
          }
        }
      } else {
        if (shouldAutoPlayRef.current || isPlayingStore) {
          lastPlayCommandTimeRef.current = Date.now();
          activeP.play();
        }
      }

      standbyP.pause();
      let nextIdx = lastQueueIndex + 1;
      if (isShuffle) {
        nextIdx = (lastQueueIndex + 1) % queue.length;
      } else if (nextIdx >= queue.length && repeatMode === 'all') {
        nextIdx = 0;
      }

      const nextSong = nextIdx >= 0 && nextIdx < queue.length ? queue[nextIdx] : null;

      if (nextSong) {
        const needsStandbyLoad =
          standbyRef.current.id !== nextSong.id || standbyRef.current.quality !== qualityType;
        if (needsStandbyLoad) {
          const streamUrl = await resolveStreamUrl(nextSong, qualityType);
          if (!isCurrent) return;

          standbyReadyRef.current = false;
          await standbyP.replaceAsync(streamUrl);
          if (!isCurrent) return;

          standbyRef.current = { id: nextSong.id, quality: qualityType };
          standbyP.pause();
          standbyReadyRef.current = true;
        }
      }
    };

    syncPlayback();
    return () => {
      isCurrent = false;
    };
  }, [
    currentSong,
    queue,
    lastQueueIndex,
    isShuffle,
    repeatMode,
    qualityType,
    activePlayerIndex,
    p0,
    p1,
    resolveStreamUrl,
  ]);

  useEffect(() => {
    if (isSourceLoadingRef.current) return;
    if (isPlayingStore) {
      lastPlayCommandTimeRef.current = Date.now();
      player.play();
    } else {
      player.pause();
    }
  }, [isPlayingStore, player]);

  useEffect(() => {
    setIsBuffering(player.status === 'loading');
    setDuration(player.duration);
    setPosition(player.currentTime);
    setBufferedPosition(player.bufferedPosition);
    setActiveTrack(player.videoTrack);
    setAvailableTracks(player.availableVideoTracks || []);

    const statusSub = player.addListener('statusChange', ({ status }) =>
      setIsBuffering(status === 'loading')
    );

    const playSub = player.addListener('playingChange', ({ isPlaying: newIsPlaying }) => {
      const timeSincePlayCommand = Date.now() - lastPlayCommandTimeRef.current;
      const isIgnoringFalse = !newIsPlaying && timeSincePlayCommand < 1000;

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
          newBuffered !== undefined && newBuffered !== null ? newBuffered : player.bufferedPosition
        );
        setDuration(player.duration);
      }
    );

    const trackSub = player.addListener('videoTrackChange', ({ videoTrack }) =>
      setActiveTrack(videoTrack)
    );

    const metadataSub = player.addListener('sourceLoad', (payload) =>
      setAvailableTracks(payload?.availableVideoTracks || [])
    );

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

  // ─── Stable Actions (zero or minimal deps — never recreated on playback) ──

  const play = useCallback((song: PlayerSong) => {
    console.log('[PlayerContext] play called for:', song.title);
    shouldAutoPlayRef.current = true;
    playerActions.playSong(song);
    router.push({ pathname: '/player', params: { songId: song.id } });
  }, []); // zero deps — stable forever

  const playAll = useCallback((songs: PlayerSong[]) => {
    console.log('[PlayerContext] playAll triggered with', songs.length, 'songs');
    if (songs.length === 0) return;
    shouldAutoPlayRef.current = true;
    playerActions.playAll(songs);
    router.push({ pathname: '/player', params: { songId: songs[0].id } });
  }, []); // zero deps — stable forever

  const seekTo = useCallback(
    (seconds: number) => {
      setPosition(seconds);
      lastSeekTimeRef.current = Date.now();
      try {
        const delta = seconds - player.currentTime;
        player.seekBy(delta);
      } catch {
        player.currentTime = seconds;
      }
    },
    [player]
  );

  const stop = useCallback(() => {
    player.pause();
    playerActions.setCurrentSong(null);
  }, [player]);

  // Uses positionRef instead of position state — no longer depends on position
  const playPrevious = useCallback(() => {
    shouldAutoPlayRef.current = true;
    const result = playerActions.playPrevious(positionRef.current);
    if (result === 'restart') {
      seekTo(0);
    }
  }, [seekTo]);

  // ─── Memoized Context Values ───────────────────────────────────────────────

  // Actions value: only recreated if seekTo/stop/playPrevious change (player swap)
  // Crucially does NOT include position/isPlaying/isBuffering etc.
  const actionsValue = useMemo<PlayerActionsContextType>(
    () => ({
      play,
      playAll,
      addToQueue: (songs: PlayerSong[]) => playerActions.addToQueue(songs),
      togglePlayPause: () => playerActions.setIsPlaying(!playerStore.state.isPlaying),
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

  // State value: changes on song/playback changes — NOT on position ticks
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

  // Progress value: updates every 50ms — isolated so only seekbar re-renders
  const progressValue = useMemo<PlayerProgressContextType>(
    () => ({
      position,
      bufferedPosition,
      duration,
    }),
    [position, bufferedPosition, duration]
  );

  // Legacy merged value (state + actions, no progress) for backwards compat
  const legacyValue = useMemo<PlayerContextType>(
    () => ({
      ...stateValue,
      ...actionsValue,
    }),
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

/**
 * Returns stable action functions only.
 * NEVER re-renders due to playback state changes.
 * Use this in SearchTab, SongRow, and any component that only needs to trigger playback.
 */
export const usePlayerActions = () => {
  const context = useContext(PlayerActionsContext);
  if (!context) throw new Error('usePlayerActions must be used within a PlayerProvider');
  return context;
};

/**
 * Returns playback state (currentSong, isPlaying, isBuffering, queue, etc.)
 * Re-renders on song/playback changes but NOT on position ticks.
 * Use this in MiniPlayer, Player screen header, etc.
 */
export const usePlayerState = () => {
  const context = useContext(PlayerStateContext);
  if (!context) throw new Error('usePlayerState must be used within a PlayerProvider');
  return context;
};

/**
 * Returns position/bufferedPosition/duration only.
 * Re-renders every 50ms during playback.
 * Use this ONLY in the seekbar/progress bar component.
 */
export const usePlayerProgress = () => {
  const context = useContext(PlayerProgressContext);
  if (!context) throw new Error('usePlayerProgress must be used within a PlayerProvider');
  return context;
};

/**
 * Legacy hook — returns state + actions merged (no position/progress).
 * Existing components using usePlayer() continue to work unchanged.
 * New components should prefer usePlayerActions() or usePlayerState().
 */
export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};