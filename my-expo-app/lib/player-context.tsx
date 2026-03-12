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
  duration: number; // seconds
  position: number; // seconds
  baseUrl: string;
  activeTrack: VideoTrack | null;
  availableTracks: VideoTrack[];
  manifestVariants: HLSVariant[];
  currentQualityType: 'auto' | 'high' | 'med' | 'low';
  setQualityType: (type: 'auto' | 'high' | 'med' | 'low') => void;
  play: (song: PlayerSong) => void;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  stop: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<PlayerSong | null>(null);

  // Create the player instance
  const player = useVideoPlayer('', (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5; // Emit timeUpdate every 0.5s
  });

  // State mirrored from player for context consumers
  const [isPlaying, setIsPlayingState] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [activeTrack, setActiveTrack] = useState<VideoTrack | null>(null);
  const [availableTracks, setAvailableTracks] = useState<VideoTrack[]>([]);
  const [manifestVariants, setManifestVariants] = useState<HLSVariant[]>([]);
  const [qualityType, setQualityType] = useState<'auto' | 'high' | 'med' | 'low'>('auto');

  const masterUrl = useMemo(() => {
    if (!currentSong) return '';
    const baseUrl = getSongBaseUrl(currentSong.storageKey) || currentSong.songBaseUrl;
    return baseUrl ? `${baseUrl}/master.m3u8` : '';
  }, [currentSong]);

  const activeStreamUrl = useMemo(() => {
    if (!masterUrl) return '';
    if (qualityType === 'auto' || manifestVariants.length === 0) return masterUrl;

    // Sort variants by bandwidth (High to Low)
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

    // Handle relative/absolute URIs
    if (targetVariant.uri.startsWith('http')) return targetVariant.uri;
    return `${baseUrl}/${targetVariant.uri}`;
  }, [masterUrl, qualityType, manifestVariants]);

  const prevSongIdRef = useRef<string | null>(null);

  // Handle manifest parsing and actual playback source (Auto vs Force)
  useEffect(() => {
    if (!masterUrl || !activeStreamUrl) {
      setManifestVariants([]);
      return;
    }

    let isEffectCurrent = true;
    const isNewSong = currentSong?.id !== prevSongIdRef.current;

    // Capture position *before* replacing the source only if it's not a new song
    const currentPos = isNewSong ? 0 : player.currentTime;

    // 1. Fetch manifest
    fetch(masterUrl)
      .then((r) => r.text())
      .then((text) => {
        if (isEffectCurrent) setManifestVariants(parseMasterM3U8(text));
      })
      .catch(() => {
        if (isEffectCurrent) setManifestVariants([]);
      });

    // 2. Proactively swap player source
    player.replaceAsync(activeStreamUrl).then(() => {
      if (!isEffectCurrent) return;
      try {
        if (currentPos > 0) {
          player.currentTime = currentPos;
        }
        player.play();
        // Update the ref to the current song ID
        prevSongIdRef.current = currentSong?.id || null;
      } catch (e) {
        console.warn('Playback resume failed:', e);
      }
    });

    return () => {
      isEffectCurrent = false;
    };
  }, [masterUrl, activeStreamUrl, player, currentSong?.id]);

  // Sync state from player
  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status }) => {
      setIsBuffering(status === 'loading');
    });

    const playSub = player.addListener('playingChange', ({ isPlaying: newIsPlaying }) => {
      setIsPlayingState(newIsPlaying);
    });

    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      setPosition(currentTime);
      setDuration(player.duration);
    });

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

  const play = useCallback((song: PlayerSong) => {
    setCurrentSong(song);
    // Track view
    musicApi.addView(song.id).catch(() => {});
    // Navigation
    router.push({
      pathname: '/player',
      params: { songId: song.id },
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

  const value = useMemo(
    () => ({
      currentSong,
      isPlaying,
      setIsPlaying,
      isBuffering,
      duration,
      position,
      baseUrl: masterUrl.replace('/master.m3u8', ''),
      activeTrack,
      availableTracks,
      manifestVariants,
      currentQualityType: qualityType,
      setQualityType,
      play,
      togglePlayPause,
      seekTo,
      stop,
    }),
    [
      currentSong,
      isPlaying,
      setIsPlaying,
      isBuffering,
      duration,
      position,
      masterUrl,
      activeTrack,
      availableTracks,
      manifestVariants,
      qualityType,
      play,
      togglePlayPause,
      seekTo,
      stop,
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
