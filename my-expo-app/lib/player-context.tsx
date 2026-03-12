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
import { getSongBaseUrl } from './s3';
import { parseMasterM3U8, HLSVariant } from './hls';
import { musicApi } from './api';
import { getCoverImageUrl } from './s3';
import { useAuth } from './auth';

export interface PlayerSong {
  id: string;
  title: string;
  artistName: string;
  storageKey: string;
  coverUrl: string | null;
  songBaseUrl?: string;
}

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
  // Queue
  queue: PlayerSong[];
  isShuffle: boolean;
  repeatMode: 'none' | 'one' | 'all';
  // Actions
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
  const [currentSong, setCurrentSong] = useState<PlayerSong | null>(null);
  const [queue, setQueue] = useState<PlayerSong[]>([]);
  const [lastQueueIndex, setLastQueueIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const { isAuthenticated } = useAuth();

  const initPlayer = (p: any) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
    p.bufferOptions = {
      preferredForwardBufferDuration: 20,
    };
  };

  const p0 = useVideoPlayer('', initPlayer);
  const p1 = useVideoPlayer('', initPlayer);

  const [activePlayerIndex, setActivePlayerIndex] = useState<0 | 1>(0);
  const player = activePlayerIndex === 0 ? p0 : p1;

  // State mirrored from player for context consumers
  const [isPlaying, setIsPlayingState] = useState(false);
  const [position, setPosition] = useState(0);
  const [bufferedPosition, setBufferedPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [activeTrack, setActiveTrack] = useState<VideoTrack | null>(null);
  const [availableTracks, setAvailableTracks] = useState<VideoTrack[]>([]);
  const [qualityType, setQualityType] = useState<'auto' | 'high' | 'med' | 'low'>('auto');

  // Refs for stable access in callbacks
  const queueRef = useRef(queue);
  const lastQueueIndexRef = useRef(lastQueueIndex);
  const isShuffleRef = useRef(isShuffle);
  const repeatModeRef = useRef(repeatMode);
  const positionRef = useRef(position);
  const currentSongRef = useRef(currentSong);
  const shouldAutoPlayRef = useRef(false);
  const activePlayerIndexRef = useRef(activePlayerIndex);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    lastQueueIndexRef.current = lastQueueIndex;
  }, [lastQueueIndex]);
  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);
  useEffect(() => {
    activePlayerIndexRef.current = activePlayerIndex;
  }, [activePlayerIndex]);

  // Load last played songs from history on mount (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadHistory = async () => {
      try {
        const res = await musicApi.getHistory(1, 10);
        const historySongs = res?.data;
        if (historySongs && historySongs.length > 0) {
          // Initialize queue with recent history, using large covers
          const historyQueue: PlayerSong[] = historySongs.map((h: any) => {
            const song = h.song || h;
            return {
              id: song.id,
              title: song.title,
              artistName: song.artistName,
              storageKey: song.storageKey,
              coverUrl: getCoverImageUrl(song.storageKey, 'large', true) || null,
            };
          });

          // Only set if queue is currently empty (avoids overwriting active playback)
          setQueue((prev) => {
            if (prev.length === 0) {
              setLastQueueIndex(0);
              const firstSong = historyQueue[0];
              setCurrentSong(firstSong);
              setPosition(0);
              setDuration(0);
              return historyQueue;
            }
            return prev;
          });
        }
      } catch (e) {
        console.warn('Failed to load history for player:', e);
      }
    };

    loadHistory();
  }, [isAuthenticated]);

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

        await activeP.replaceAsync(streamUrl);
        activeRef.current = { id: currentSong.id, quality: qualityType };

        if (shouldAutoPlayRef.current) activeP.play();
      } else {
        if (shouldAutoPlayRef.current && !activeP.playing) activeP.play();
      }

      // 2. Preload Standby Player
      let nextIdx = lastQueueIndex + 1;
      if (isShuffle) {
        nextIdx = (lastQueueIndex + 3) % queue.length; // Fake random for next UI display
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

          await standbyP.replaceAsync(streamUrl);
          standbyRef.current = { id: nextSong.id, quality: qualityType };
          standbyP.pause(); // Ensure it stays paused in background
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

  // ── Internal: set current song with queue index tracking ──
  const setCurrentSongWithIndex = useCallback((song: PlayerSong | null) => {
    if (song) {
      const idx = queueRef.current.findIndex((s) => s.id === song.id);
      if (idx !== -1) setLastQueueIndex(idx);
    }
    setCurrentSong(song);
    setPosition(0);
    setDuration(0);
  }, []);

  // ── playNext ──
  const playNext = useCallback(() => {
    shouldAutoPlayRef.current = true;
    const q = queueRef.current;
    const idx = lastQueueIndexRef.current;
    const rm = repeatModeRef.current;
    const shuffle = isShuffleRef.current;
    const cs = currentSongRef.current;

    if (q.length === 0) return;

    if (rm === 'one' && cs) {
      // Repeat one: restart current song
      player.currentTime = 0;
      player.play();
      return;
    }

    let nextIndex = idx + 1;

    if (shuffle && q.length > 1) {
      nextIndex = Math.floor(Math.random() * q.length);
      // Avoid replaying the same song
      if (nextIndex === idx && q.length > 1) {
        nextIndex = (nextIndex + 1) % q.length;
      }
    }

    if (nextIndex >= 0 && nextIndex < q.length) {
      const nextSong = q[nextIndex];
      const standbyRef = activePlayerIndexRef.current === 0 ? p1SongRef : p0SongRef;

      player.pause(); // Pause current before swapping

      if (standbyRef.current.id === nextSong.id && standbyRef.current.quality === qualityType) {
        setActivePlayerIndex((prev) => (prev === 0 ? 1 : 0));
      }

      setCurrentSongWithIndex(nextSong);
      setTimeout(() => musicApi.addView(nextSong.id).catch(() => {}), 0);
    } else if (rm === 'all' && q.length > 0) {
      const nextSong = q[0];
      const standbyRef = activePlayerIndexRef.current === 0 ? p1SongRef : p0SongRef;

      player.pause(); // Pause current before swapping

      if (standbyRef.current.id === nextSong.id && standbyRef.current.quality === qualityType) {
        setActivePlayerIndex((prev) => (prev === 0 ? 1 : 0));
      }

      setCurrentSongWithIndex(nextSong);
      setTimeout(() => musicApi.addView(nextSong.id).catch(() => {}), 0);
    }

    // Auto-fetch more songs when nearing end of queue
    const remaining = q.length - nextIndex - 1;
    if (remaining <= 2) {
      fetchAndAddFeedToQueue();
    }
  }, [player, setCurrentSongWithIndex, qualityType]);

  // ── playPrevious ──
  const playPrevious = useCallback(() => {
    shouldAutoPlayRef.current = true;
    const q = queueRef.current;
    const idx = lastQueueIndexRef.current;
    const rm = repeatModeRef.current;
    const pos = positionRef.current;

    if (q.length === 0) return;

    // If more than 3 seconds in, restart current song
    if (pos > 3) {
      shouldAutoPlayRef.current = true;
      player.currentTime = 0;
      player.play();
      return;
    }

    const prevIndex = idx - 1;

    if (prevIndex >= 0) {
      player.pause();
      setCurrentSongWithIndex(q[prevIndex]);
      setTimeout(() => musicApi.addView(q[prevIndex].id).catch(() => {}), 0);
    } else if (rm === 'all' && q.length > 0) {
      player.pause();
      setCurrentSongWithIndex(q[q.length - 1]);
      setTimeout(() => musicApi.addView(q[q.length - 1].id).catch(() => {}), 0);
    } else {
      // Restart current song
      player.currentTime = 0;
      player.play();
    }
  }, [player, setCurrentSongWithIndex]);

  // ── Auto-fetch more feed songs to queue ──
  const fetchAndAddFeedToQueue = useCallback(async () => {
    try {
      const currentIds = queueRef.current.map((s) => s.id);
      const feedData = await musicApi.getFeed(currentIds);
      if (feedData?.data) {
        const newSongs: PlayerSong[] = feedData.data.map((s: any) => ({
          id: s.id,
          title: s.title,
          artistName: s.artistName,
          storageKey: s.storageKey,
          coverUrl: null,
        }));
        setQueue((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const filtered = newSongs.filter((s) => !existingIds.has(s.id));
          return [...prev, ...filtered];
        });
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    }
  }, []);

  // ── Sync state from player events ──
  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status }) => {
      setIsBuffering(status === 'loading');
    });

    const playSub = player.addListener('playingChange', ({ isPlaying: newIsPlaying }) => {
      setIsPlayingState(newIsPlaying);
    });

    const timeSub = player.addListener(
      'timeUpdate',
      ({ currentTime, bufferedPosition: newBuffered }) => {
        setPosition(currentTime);
        setBufferedPosition(newBuffered ?? player.bufferedPosition);
        setDuration(player.duration);
      }
    );

    const trackSub = player.addListener('videoTrackChange', ({ videoTrack }) => {
      setActiveTrack(videoTrack);
    });

    const metadataSub = player.addListener('sourceLoad', (payload) => {
      setAvailableTracks(payload?.availableVideoTracks || []);
    });

    return () => {
      statusSub.remove();
      playSub.remove();
      timeSub.remove();
      trackSub.remove();
      metadataSub.remove();
    };
  }, [player]);

  // ── Auto-play next song when current one finishes ──
  useEffect(() => {
    const sub = player.addListener('playToEnd', () => {
      playNext();
    });
    return () => sub.remove();
  }, [player, playNext]);

  // ── Public: play a single song ──
  const play = useCallback(
    (song: PlayerSong) => {
      shouldAutoPlayRef.current = true;
      // Add to queue if not already there
      setQueue((prev) => {
        const exists = prev.some((s) => s.id === song.id);
        if (!exists) return [...prev, song];
        return prev;
      });
      setCurrentSongWithIndex(song);
      // Fire-and-forget: never block playback for a view track
      setTimeout(() => musicApi.addView(song.id).catch(() => {}), 0);
      router.push({
        pathname: '/player',
        params: { songId: song.id },
      });
    },
    [setCurrentSongWithIndex]
  );

  // ── Public: play all songs (replaces queue) ──
  const playAll = useCallback((songs: PlayerSong[]) => {
    if (songs.length === 0) return;
    shouldAutoPlayRef.current = true;
    setQueue(songs);
    setLastQueueIndex(0);
    setCurrentSong(songs[0]);
    setPosition(0);
    setDuration(0);
    musicApi.addView(songs[0].id).catch(() => {});
  }, []);

  // ── Public: add songs to end of queue ──
  const addToQueue = useCallback((songs: PlayerSong[]) => {
    setQueue((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const filtered = songs.filter((s) => !existingIds.has(s.id));
      return [...prev, ...filtered];
    });
  }, []);

  const togglePlayPause = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const setIsPlaying = useCallback(
    (playing: boolean) => {
      if (playing) player.play();
      else player.pause();
    },
    [player]
  );

  const seekTo = useCallback(
    (seconds: number) => {
      player.currentTime = seconds;
    },
    [player]
  );

  const stop = useCallback(() => {
    player.pause();
    setCurrentSong(null);
    setPosition(0);
    setDuration(0);
  }, [player]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      const next: Record<string, 'none' | 'one' | 'all'> = {
        none: 'all',
        all: 'one',
        one: 'none',
      };
      return next[prev];
    });
  }, []);

  const value = useMemo(
    () => ({
      currentSong,
      isPlaying,
      setIsPlaying,
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
      addToQueue,
      togglePlayPause,
      seekTo,
      stop,
      playNext,
      playPrevious,
      toggleShuffle,
      toggleRepeat,
    }),
    [
      currentSong,
      isPlaying,
      setIsPlaying,
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
      addToQueue,
      togglePlayPause,
      seekTo,
      stop,
      playNext,
      playPrevious,
      toggleShuffle,
      toggleRepeat,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
