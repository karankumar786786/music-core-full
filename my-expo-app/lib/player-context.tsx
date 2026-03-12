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
  manifestVariants: HLSVariant[];
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

  // Create the player instance
  const player = useVideoPlayer('', (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
    p.bufferOptions = {
      preferredForwardBufferDuration: 20,
    };
  });

  // Create headless players for preloading the next 2 songs
  const preloadPlayer1 = useVideoPlayer('', (p) => {
    p.loop = false;
    p.muted = true;
  });
  const preloadPlayer2 = useVideoPlayer('', (p) => {
    p.loop = false;
    p.muted = true;
  });

  // State mirrored from player for context consumers
  const [isPlaying, setIsPlayingState] = useState(false);
  const [position, setPosition] = useState(0);
  const [bufferedPosition, setBufferedPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [activeTrack, setActiveTrack] = useState<VideoTrack | null>(null);
  const [availableTracks, setAvailableTracks] = useState<VideoTrack[]>([]);
  const [manifestVariants, setManifestVariants] = useState<HLSVariant[]>([]);
  const [qualityType, setQualityType] = useState<'auto' | 'high' | 'med' | 'low'>('auto');

  // Refs for stable access in callbacks
  const queueRef = useRef(queue);
  const lastQueueIndexRef = useRef(lastQueueIndex);
  const isShuffleRef = useRef(isShuffle);
  const repeatModeRef = useRef(repeatMode);
  const positionRef = useRef(position);
  const currentSongRef = useRef(currentSong);
  const shouldAutoPlayRef = useRef(false);

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

  const masterUrl = useMemo(() => {
    if (!currentSong) return '';
    const baseUrl = getSongBaseUrl(currentSong.storageKey) || currentSong.songBaseUrl;
    return baseUrl ? `${baseUrl}/master.m3u8` : '';
  }, [currentSong]);

  const activeStreamUrl = useMemo(() => {
    if (!masterUrl) return '';
    if (qualityType === 'auto' || manifestVariants.length === 0) return masterUrl;

    const sorted = [...manifestVariants].sort((a, b) => b.bandwidth - a.bandwidth);
    const baseUrl = masterUrl.replace('/master.m3u8', '');

    let targetVariant: HLSVariant;
    if (qualityType === 'high') {
      targetVariant = sorted[0];
    } else if (qualityType === 'med') {
      targetVariant = sorted[Math.floor(sorted.length / 2)];
    } else {
      targetVariant = sorted[sorted.length - 1];
    }

    if (targetVariant.uri.startsWith('http')) return targetVariant.uri;
    return `${baseUrl}/${targetVariant.uri}`;
  }, [masterUrl, qualityType, manifestVariants]);

  const prevSongIdRef = useRef<string | null>(null);

  // Handle manifest parsing and actual playback source
  useEffect(() => {
    if (!masterUrl || !activeStreamUrl) {
      setManifestVariants([]);
      return;
    }

    let isEffectCurrent = true;
    const isNewSong = currentSong?.id !== prevSongIdRef.current;
    const currentPos = isNewSong ? 0 : player.currentTime;

    fetch(masterUrl)
      .then((r) => r.text())
      .then((text) => {
        if (isEffectCurrent) setManifestVariants(parseMasterM3U8(text));
      })
      .catch(() => {
        if (isEffectCurrent) setManifestVariants([]);
      });

    player.replaceAsync(activeStreamUrl).then(() => {
      if (!isEffectCurrent) return;
      try {
        if (currentPos > 0) {
          player.currentTime = currentPos;
        }
        if (shouldAutoPlayRef.current) {
          player.play();
        }
        prevSongIdRef.current = currentSong?.id || null;
      } catch (e) {
        console.warn('Playback resume failed:', e);
      }
    });

    return () => {
      isEffectCurrent = false;
    };
  }, [masterUrl, activeStreamUrl, player, currentSong?.id]);

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

    if (nextIndex < q.length) {
      setCurrentSongWithIndex(q[nextIndex]);
      setTimeout(() => musicApi.addView(q[nextIndex].id).catch(() => {}), 0);
    } else if (rm === 'all' && q.length > 0) {
      setCurrentSongWithIndex(q[0]);
      setTimeout(() => musicApi.addView(q[0].id).catch(() => {}), 0);
    }

    // Auto-fetch more songs when nearing end of queue
    const remaining = q.length - nextIndex - 1;
    if (remaining <= 2) {
      fetchAndAddFeedToQueue();
    }
  }, [player, setCurrentSongWithIndex]);

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
      setCurrentSongWithIndex(q[prevIndex]);
      setTimeout(() => musicApi.addView(q[prevIndex].id).catch(() => {}), 0);
    } else if (rm === 'all' && q.length > 0) {
      setCurrentSongWithIndex(q[q.length - 1]);
      setTimeout(() => musicApi.addView(q[q.length - 1].id).catch(() => {}), 0);
    } else {
      // Restart current song
      player.currentTime = 0;
      player.play();
    }
  }, [player, setCurrentSongWithIndex]);

  // ── Preload upcoming songs ──
  useEffect(() => {
    if (!currentSong || queue.length <= 1) return;

    let next1Idx = lastQueueIndex + 1;
    let next2Idx = lastQueueIndex + 2;

    if (isShuffle) {
      // Very basic pseudo-random for display/preload purposes
      // (Actual random is generated at playNext time)
      next1Idx = (lastQueueIndex + 3) % queue.length;
      next2Idx = (lastQueueIndex + 7) % queue.length;
    }

    const next1 =
      next1Idx < queue.length
        ? queue[next1Idx]
        : repeatMode === 'all' && queue.length > 0
          ? queue[0]
          : null;

    const next2 =
      next2Idx < queue.length
        ? queue[next2Idx]
        : repeatMode === 'all' && queue.length > 1
          ? queue[1]
          : null;

    // Helper to extract and load the highest quality stream URL
    const preloadSong = async (song: PlayerSong, p: ReturnType<typeof useVideoPlayer>) => {
      try {
        const baseUrl = getSongBaseUrl(song.storageKey) || song.songBaseUrl;
        if (!baseUrl) return;
        const m3u8Url = `${baseUrl}/master.m3u8`;

        const res = await fetch(m3u8Url);
        const text = await res.text();
        const variants = parseMasterM3U8(text);

        if (variants.length > 0) {
          // Preload highest quality
          const sorted = [...variants].sort((a, b) => b.bandwidth - a.bandwidth);
          const target = sorted[0];
          const streamUrl = target.uri.startsWith('http') ? target.uri : `${baseUrl}/${target.uri}`;
          p.replaceAsync(streamUrl);
        } else {
          p.replaceAsync(m3u8Url); // Fallback to master
        }
      } catch (e) {
        // Silently ignore prefetch failures
      }
    };

    if (next1) preloadSong(next1, preloadPlayer1);
    if (next2) preloadSong(next2, preloadPlayer2);
  }, [currentSong, queue, lastQueueIndex, isShuffle, repeatMode, preloadPlayer1, preloadPlayer2]);

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
      baseUrl: masterUrl.replace('/master.m3u8', ''),
      activeTrack,
      availableTracks,
      manifestVariants,
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
      masterUrl,
      activeTrack,
      availableTracks,
      manifestVariants,
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
