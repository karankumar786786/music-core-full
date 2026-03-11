import React from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePlayer } from '../lib/player-context';
import { capitalize } from '../lib/utils';

export default function MiniPlayer() {
  const { currentSong, isPlaying, isBuffering, position, duration, togglePlayPause } = usePlayer();

  if (!currentSong) return null;

  const progress = duration > 0 ? position / duration : 0;

  const openFullPlayer = () => {
    router.push({
      pathname: '/player',
      params: {
        songId: currentSong.id,
        title: currentSong.title,
        artistName: currentSong.artistName,
        storageKey: currentSong.storageKey,
        coverUrl: currentSong.coverUrl || '',
      },
    });
  };

  return (
    <View className="border-t border-white/5 bg-zinc-950">
      {/* Progress bar */}
      <View className="h-[2px] bg-zinc-800">
        <View className="h-full bg-green-500" style={{ width: `${progress * 100}%` }} />
      </View>

      <Pressable onPress={openFullPlayer} className="flex-row items-center gap-3 px-4 py-3">
        {/* Cover */}
        <View className="h-11 w-11 overflow-hidden rounded-xl border border-white/5 bg-zinc-800">
          {currentSong.coverUrl ? (
            <Image
              source={{ uri: currentSong.coverUrl }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-green-500/10">
              <Ionicons name="musical-notes" size={18} color="#22c55e" />
            </View>
          )}
        </View>

        {/* Song info */}
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-white" numberOfLines={1}>
            {capitalize(currentSong.title)}
          </Text>
          <Text className="text-xs font-semibold text-zinc-500" numberOfLines={1}>
            {capitalize(currentSong.artistName)}
          </Text>
        </View>

        {/* Play/Pause */}
        <Pressable
          onPress={(e) => {
            togglePlayPause();
          }}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
          hitSlop={8}>
          {isBuffering ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color="#000"
              style={!isPlaying ? { marginLeft: 2 } : undefined}
            />
          )}
        </Pressable>
      </Pressable>
    </View>
  );
}
