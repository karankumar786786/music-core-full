import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { router } from 'expo-router';
import { useVideoPlayer } from 'expo-video';
import { getSongBaseUrl } from './s3';
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

  const streamUrl = useMemo(() => {
    if (!currentSong) return '';
    const baseUrl = getSongBaseUrl(currentSong.storageKey) || currentSong.songBaseUrl;
    return baseUrl ? `${baseUrl}/master.m3u8` : '';
  }, [currentSong]);

  // Handle source changes
  useEffect(() => {
    if (streamUrl) {
      player.replace(streamUrl);
      player.play();
    }
  }, [streamUrl, player]);

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

    return () => {
      statusSub.remove();
      playSub.remove();
      timeSub.remove();
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
      baseUrl: streamUrl.replace('/master.m3u8', ''),
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
      streamUrl,
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
