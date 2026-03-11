import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { getSongBaseUrl } from './s3';
import { musicApi } from './api';

export interface PlayerSong {
  id: string;
  title: string;
  artistName: string;
  storageKey: string;
  coverUrl: string | null;
}

interface PlayerContextType {
  currentSong: PlayerSong | null;
  isPlaying: boolean;
  isBuffering: boolean;
  duration: number;
  position: number;
  play: (song: PlayerSong) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (fraction: number) => Promise<void>;
  stop: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType>({
  currentSong: null,
  isPlaying: false,
  isBuffering: false,
  duration: 0,
  position: 0,
  play: async () => {},
  togglePlayPause: async () => {},
  seekTo: async () => {},
  stop: async () => {},
});

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  // Generation counter to prevent race conditions when rapidly switching songs
  const generationRef = useRef(0);
  const [currentSong, setCurrentSong] = useState<PlayerSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const play = useCallback(async (song: PlayerSong) => {
    // Increment generation — any in-flight load with older generation is stale
    const thisGeneration = ++generationRef.current;

    // Immediately unload previous sound
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (_) {}
      soundRef.current = null;
    }

    const baseUrl = getSongBaseUrl(song.storageKey);
    if (!baseUrl) return;
    const streamUrl = `${baseUrl}/master.m3u8`;

    // Set state immediately
    setCurrentSong(song);
    setIsBuffering(true);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Check if a newer song was requested before we finish loading
      if (generationRef.current !== thisGeneration) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true },
        (status: AVPlaybackStatus) => {
          // Only process status updates for the current generation
          if (generationRef.current !== thisGeneration) return;
          if (!status.isLoaded) return;
          setDuration(status.durationMillis || 0);
          setPosition(status.positionMillis || 0);
          setIsPlaying(status.isPlaying);
          setIsBuffering(status.isBuffering);
        }
      );

      // If stale, immediately unload the sound we just created
      if (generationRef.current !== thisGeneration) {
        await sound.unloadAsync();
        return;
      }

      soundRef.current = sound;
      musicApi.addView(song.id).catch(() => {});

      // Centralized navigation: whenever a song starts playing, open the full player
      router.push({
        pathname: '/player',
        params: { songId: song.id },
      });
    } catch (err) {
      if (generationRef.current === thisGeneration) {
        console.error('Failed to load audio:', err);
        setIsBuffering(false);
      }
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded && status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, []);

  const seekTo = useCallback(async (fraction: number) => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded && status.durationMillis) {
      await soundRef.current.setPositionAsync(fraction * status.durationMillis);
    }
  }, []);

  const stop = useCallback(async () => {
    generationRef.current++;
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (_) {}
      soundRef.current = null;
    }
    setCurrentSong(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setPosition(0);
    setDuration(0);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        isBuffering,
        duration,
        position,
        play,
        togglePlayPause,
        seekTo,
        stop,
      }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
