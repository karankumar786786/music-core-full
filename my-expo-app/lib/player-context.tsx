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

  // Visual/Playback state mirrored from player (non-global store items)
  const [position, setPosition] = useState(0);
  const [bufferedPosition, setBufferedPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [activeTrack, setActiveTrack] = useState<VideoTrack | null>(null);
  const [availableTracks, setAvailableTracks] = useState<VideoTrack[]>([]);
  const [qualityType, setQualityType] = useState<'auto' | 'high' | 'med' | 'low'>('auto');

  const shouldAutoPlayRef = useRef(false);

  // Restore history on mount
  useEffect(() => {
    if (isAuthenticated) {
      playerActions.restoreFromHistory();
    }
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
      }

      // 2. Preload Standby Player
      let nextIdx = lastQueueIndex + 1;
      if (isShuffle) {
        nextIdx = (lastQueueIndex + 1) % queue.length; // Use simple next for standby
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
          standbyP.pause();
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

  // Sync Store isPlaying -> Player status
  useEffect(() => {
    if (isPlayingStore) player.play();
    else player.pause();
  }, [isPlayingStore, player]);

  // Sync Player events -> Local/Store state
  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status }) =>
      setIsBuffering(status === 'loading')
    );
    const playSub = player.addListener('playingChange', ({ isPlaying: newIsPlaying }) => {
      // Guard: Only sync back if not loading and value is different
      if (player.status !== 'loading' && newIsPlaying !== playerStore.state.isPlaying) {
        playerActions.setIsPlaying(newIsPlaying);
      }
    });
    const timeSub = player.addListener(
      'timeUpdate',
      ({ currentTime, bufferedPosition: newBuffered }) => {
        setPosition(currentTime);
        setBufferedPosition(newBuffered ?? player.bufferedPosition);
        setDuration(player.duration);
      }
    );
    const trackSub = player.addListener('videoTrackChange', ({ videoTrack }) =>
      setActiveTrack(videoTrack)
    );
    const metadataSub = player.addListener('sourceLoad', (payload) =>
      setAvailableTracks(payload?.availableVideoTracks || [])
    );
    const endSub = player.addListener('playToEnd', () => playerActions.playNext());

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
    playerActions.setCurrentSong(song);
    // Ensure it's in queue if not present (simplified add-if-not-exists)
    playerStore.setState((s) => {
      if (s.queue.find((x) => x.id === song.id)) return s;
      return { ...s, queue: [...s.queue, song] };
    });
    setTimeout(() => musicApi.addView(song.id).catch(() => {}), 0);
    router.push({ pathname: '/player', params: { songId: song.id } });
  }, []);

  const playAll = useCallback((songs: PlayerSong[]) => {
    if (songs.length === 0) return;
    shouldAutoPlayRef.current = true;
    playerActions.playAll(songs);
    musicApi.addView(songs[0].id).catch(() => {});
  }, []);

  const stop = useCallback(() => {
    player.pause();
    playerActions.setCurrentSong(null);
  }, [player]);

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
      seekTo: (s: number) => {
        player.currentTime = s;
      },
      stop,
      playNext: () => {
        shouldAutoPlayRef.current = true;
        playerActions.playNext();
      },
      playPrevious: () => {
        shouldAutoPlayRef.current = true;
        playerActions.playPrevious();
      },
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
      stop,
      player,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};
