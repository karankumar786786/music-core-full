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
  // Only subscribe to fields that this component genuinely needs to react to.
  // Critically: we do NOT subscribe to `queue` here — queue changes on every
  // playAll (N songs added at once) which would cause the syncPlayback effect
  // to re-fire N times, creating the infinite render loop.
  // Queue is read imperatively inside effects via playerStore.state.queue.
  const currentSong = useStore(playerStore, (s) => s.currentSong);
  const lastQueueIndex = useStore(playerStore, (s) => s.lastQueueIndex);
  const isShuffle = useStore(playerStore, (s) => s.isShuffle);
  const repeatMode = useStore(playerStore, (s) => s.repeatMode);
  const isPlayingStore = useStore(playerStore, (s) => s.isPlaying);
  // queue is only needed for the stateValue/legacyValue memos (UI display).
  // It does NOT appear in any effect dependency array.
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

  // shouldAutoPlayRef: set to true by play/playAll/playNext/playPrevious actions
  // in the context. syncPlayback reads this to decide whether to call player.play()
  // after loading. This decouples "user intent to play" from isPlayingStore so
  // we never start the old stream while the new one is loading.
  const shouldAutoPlayRef = useRef(false);
  const isSourceLoadingRef = useRef(false);
  const lastPlayCommandTimeRef = useRef<number>(0);
  const lastSeekTimeRef = useRef<number>(0);
  const standbyReadyRef = useRef(false);
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

  // Swap to standby player if it already has the new song preloaded.
  // Guard: never swap while a load is in-flight — that would abandon
  // the active replaceAsync and leave the player in an inconsistent state.
  useEffect(() => {
    if (!currentSong) return;
    if (isSourceLoadingRef.current) return;

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

  // ── Sync Playback ─────────────────────────────────────────────────────────
  // Responsible ONLY for loading + playing the active stream.
  // Does NOT preload standby — that lives in its own effect below so these
  // two concerns never share a dependency array and can't trigger each other.

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

      const isQualityChange =
        activeRef.current.id === currentSong.id && activeRef.current.quality !== qualityType;
      const needsActiveLoad = activeRef.current.id !== currentSong.id || isQualityChange;

      if (needsActiveLoad) {
        const wasPlaying = shouldAutoPlayRef.current || isPlayingStore;

        // Resolve URL first (async), THEN snapshot position.
        // This way preservedPos is captured as late as possible — right before
        // we touch the player — minimising drift caused by the network round-trip.
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
            // Update UI immediately so seekbar doesn't snap to 0
            setPosition(preservedPos);
            lastSeekTimeRef.current = Date.now();

            try {
              activeP.currentTime = preservedPos;
            } catch {
              try { activeP.seekBy(preservedPos - activeP.currentTime); } catch {}
            }

            // 120 ms lets expo-video commit the seek on both iOS + Android
            // before play() fires, eliminating the 1-2s audible skip.
            await new Promise<void>((resolve) => setTimeout(resolve, 120));
            if (!isCurrent) return;
          }

          if (wasPlaying) {
            lastPlayCommandTimeRef.current = Date.now();
            // Sync store to true now that the stream is actually ready.
            // This is the single moment isPlaying flips to true — not in the store
            // actions, not before replaceAsync — only here, when we're about to play.
            playerActions.setIsPlaying(true);
            activeP.play();
          }
        } catch (err) {
          console.error('[PlayerContext] replaceAsync FAILED:', err);
        } finally {
          if (isCurrent) isSourceLoadingRef.current = false;
        }
      } else {
        // Stream already loaded for this song — just honour play/pause state
        if (shouldAutoPlayRef.current || isPlayingStore) {
          lastPlayCommandTimeRef.current = Date.now();
          activeP.play();
        } else {
          activeP.pause();
        }
      }

      // Reset autoplay intent after acting on it
      shouldAutoPlayRef.current = false;
    };

    syncPlayback();
    return () => {
      isCurrent = false;
    };
  }, [
    // Intentionally excludes `queue` — queue changes must NOT re-trigger
    // the active stream load. Standby preloading handles queue in its own effect.
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
  // Completely isolated from syncPlayback so queue updates (playAll, feed sync)
  // only re-run preloading, never the active stream load.

  useEffect(() => {
    let isCurrent = true;

    const preloadStandby = async () => {
      if (!currentSong) return;

      const standbyP = activePlayerIndex === 0 ? p1 : p0;
      const standbyRef = activePlayerIndex === 0 ? p1SongRef : p0SongRef;

      // Read queue imperatively — not as a dep — to get the latest snapshot
      const { queue: currentQueue } = playerStore.state;

      let nextIdx = lastQueueIndex + 1;
      if (isShuffle) {
        nextIdx = (lastQueueIndex + 1) % Math.max(currentQueue.length, 1);
      } else if (nextIdx >= currentQueue.length && repeatMode === 'all') {
        nextIdx = 0;
      }

      const nextSong =
        nextIdx >= 0 && nextIdx < currentQueue.length ? currentQueue[nextIdx] : null;

      if (!nextSong) return;

      const needsStandbyLoad =
        standbyRef.current.id !== nextSong.id || standbyRef.current.quality !== qualityType;

      if (!needsStandbyLoad) return;

      const streamUrl = await resolveStreamUrl(nextSong, qualityType);
      if (!isCurrent) return;

      standbyReadyRef.current = false;
      try {
        await standbyP.replaceAsync(streamUrl);
        if (!isCurrent) return;
        standbyRef.current = { id: nextSong.id, quality: qualityType };
        standbyP.pause();
        standbyReadyRef.current = true;
      } catch {
        // Non-critical — standby failure just means no instant track swap
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
    // queue intentionally excluded — read imperatively inside the effect
  ]);

  // ── Sync Store isPlaying → Player ─────────────────────────────────────────
  // Fires when the user taps play/pause (togglePlayPause).
  // Guarded by isSourceLoadingRef so it never plays the old stream
  // while a new one is being loaded by syncPlayback.

  useEffect(() => {
    if (isSourceLoadingRef.current) return;
    if (isPlayingStore) {
      lastPlayCommandTimeRef.current = Date.now();
      player.play();
    } else {
      player.pause();
    }
  }, [isPlayingStore, player]);

  // ── Sync Player Events → State ────────────────────────────────────────────

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

  // ── Stable Actions ────────────────────────────────────────────────────────

  const play = useCallback((song: PlayerSong) => {
    console.log('[PlayerContext] play called for:', song.title);
    shouldAutoPlayRef.current = true;
    playerActions.playSong(song);
    router.navigate('/player');
  }, []);

  const playAll = useCallback((songs: PlayerSong[]) => {
    console.log('[PlayerContext] playAll triggered with', songs.length, 'songs');
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