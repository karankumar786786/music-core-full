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
import { musicApi } from './api';
import { useAuth } from './auth';
import { playerStore, playerActions, PlayerSong } from './player-store';
export { PlayerSong };

interface PlayerContextType {
  currentSong: PlayerSong | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isBuffering: boolean;
  duration: number;
  position: number;
  bufferedPosition: number;
  baseUrl: string;
  activeTrack: VideoTrack | null;
  availableTracks: VideoTrack[];
  currentQualityType: 'auto' | 'high' | 'med' | 'low';
  setQualityType: (type: 'auto' | 'high' | 'med' | 'low') => void;
  queue: PlayerSong[];
  isShuffle: boolean;
  repeatMode: 'none' | 'one' | 'all';
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
}

const PlayerContext = createContext<PlayerContextType | null>(null);

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
    p.timeUpdateEventInterval = 0.5;
    p.bufferOptions = { preferredForwardBufferDuration: 20 };
  };

  const p0 = useVideoPlayer('', initPlayer);
  const p1 = useVideoPlayer('', initPlayer);

  const [activePlayerIndex, setActivePlayerIndex] = useState<0 | 1>(0);
  const player = activePlayerIndex === 0 ? p0 : p1;

  // Visual/Playback state mirrored from player
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

  // FIX #1: Track when standby player has fully finished loading
  const standbyReadyRef = useRef(false);

  // Restore history on mount
  useEffect(() => {
    if (isAuthenticated) {
      playerActions.restoreFromHistory();
    }
  }, [isAuthenticated]);

  // FIX #3: Reset isSourceLoadingRef when active player index changes
  // so the isPlayingStore sync effect is not blocked by the previous player's load state
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
      const res = await fetch(masterUrl);
      const text = await res.text();
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

  // FIX #1: Ping-Pong A/B Swap — only swap when standby is fully ready
  useEffect(() => {
    if (!currentSong) return;
    const standbyIdx = activePlayerIndex === 0 ? 1 : 0;
    const standbyRef = standbyIdx === 0 ? p0SongRef : p1SongRef;

    if (
      standbyRef.current.id === currentSong.id &&
      standbyRef.current.quality === qualityType &&
      standbyReadyRef.current // Only swap after standby has fully loaded
    ) {
      standbyReadyRef.current = false; // Reset for next preload cycle
      setActivePlayerIndex(standbyIdx as 0 | 1);
    }
  }, [currentSong, qualityType, activePlayerIndex]);

  // ── Sync Playback & Preload ──
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

      // 1. Sync Active Player
      const needsActiveLoad =
        activeRef.current.id !== currentSong.id || activeRef.current.quality !== qualityType;

      if (needsActiveLoad) {
        const streamUrl = await resolveStreamUrl(currentSong, qualityType);
        if (!isCurrent) return;

        isSourceLoadingRef.current = true;
        try {
          await activeP.replaceAsync(streamUrl);
          if (!isCurrent) return;
          activeRef.current = { id: currentSong.id, quality: qualityType };

          if (shouldAutoPlayRef.current || isPlayingStore) {
            lastPlayCommandTimeRef.current = Date.now();
            activeP.play();
          }
        } finally {
          if (isCurrent) {
            isSourceLoadingRef.current = false;
          }
        }
      } else {
        // Already loaded (from a ping-pong swap) — just ensure correct play state
        if (shouldAutoPlayRef.current || isPlayingStore) {
          lastPlayCommandTimeRef.current = Date.now();
          activeP.play();
        }
      }

      // 2. Preload Standby Player
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

          standbyReadyRef.current = false; // Mark not ready while loading
          await standbyP.replaceAsync(streamUrl);
          if (!isCurrent) return;

          standbyRef.current = { id: nextSong.id, quality: qualityType };
          standbyP.pause();
          standbyReadyRef.current = true; // FIX #1: Mark ready only after load completes
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

  // Sync Store isPlaying -> Player
  useEffect(() => {
    // Only sync if source isn't actively loading, to avoid fighting with replaceAsync
    if (isSourceLoadingRef.current) return;

    if (isPlayingStore) {
      lastPlayCommandTimeRef.current = Date.now();
      player.play();
    } else {
      player.pause();
    }
  }, [isPlayingStore, player]);

  // Sync Player events -> Local/Store state
  useEffect(() => {
    // Initial sync when player instance changes (after a swap)
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
        setPosition(currentTime);
        // FIX #5: Use strict null check — newBuffered can be 0 (falsy but valid)
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

    // FIX #2: Set shouldAutoPlayRef before playNext so next song autoplays
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

  const play = useCallback((song: PlayerSong) => {
    shouldAutoPlayRef.current = true;
    playerActions.playSong(song);
    router.push({ pathname: '/player', params: { songId: song.id } });
  }, []);

  const playAll = useCallback((songs: PlayerSong[]) => {
    if (songs.length === 0) return;
    shouldAutoPlayRef.current = true;
    playerActions.playAll(songs);
  }, []);

  const stop = useCallback(() => {
    player.pause();
    playerActions.setCurrentSong(null);
  }, [player]);

  // FIX #4: seekTo uses correct expo-video API
  const seekTo = useCallback(
    (seconds: number) => {
      try {
        // expo-video exposes seekBy — calculate delta from current position
        const delta = seconds - player.currentTime;
        player.seekBy(delta);
      } catch {
        // Fallback: direct property assignment for older expo-video versions
        player.currentTime = seconds;
      }
    },
    [player]
  );

  // FIX #6: playPrevious passes current position to store action
  const playPrevious = useCallback(() => {
    shouldAutoPlayRef.current = true;
    const result = playerActions.playPrevious(position);
    if (result === 'restart') {
      seekTo(0);
    }
  }, [position, seekTo]);

  const value = useMemo(
    () => ({
      currentSong,
      isPlaying: isPlayingStore,
      setIsPlaying: (p: boolean) => playerActions.setIsPlaying(p),
      isBuffering,
      duration,
      position,
      bufferedPosition,
      baseUrl: currentSong
        ? getSongBaseUrl(currentSong.storageKey) || currentSong.songBaseUrl || ''
        : '',
      activeTrack,
      availableTracks,
      currentQualityType: qualityType,
      setQualityType,
      queue,
      isShuffle,
      repeatMode,
      play,
      playAll,
      addToQueue: (songs: PlayerSong[]) => playerActions.addToQueue(songs),
      togglePlayPause: () => playerActions.setIsPlaying(!isPlayingStore),
      seekTo,
      stop,
      playNext: () => {
        shouldAutoPlayRef.current = true;
        playerActions.playNext();
      },
      playPrevious,
      toggleShuffle: () => playerActions.toggleShuffle(),
      toggleRepeat: () => playerActions.toggleRepeat(),
    }),
    [
      currentSong,
      isPlayingStore,
      isBuffering,
      duration,
      position,
      bufferedPosition,
      activeTrack,
      availableTracks,
      qualityType,
      queue,
      isShuffle,
      repeatMode,
      play,
      playAll,
      seekTo,
      stop,
      playPrevious,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};