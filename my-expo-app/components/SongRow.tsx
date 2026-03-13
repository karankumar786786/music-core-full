import { useState, useEffect } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getCoverImageUrl } from '../lib/s3';
import { capitalize } from '../lib/utils';
import { musicApi } from '../lib/api';
import { usePlayer } from '../lib/player-context';

interface SongRowProps {
  song: any;
  index: number;
  onPress?: () => void;
}

export default function SongRow({ song, index, onPress }: SongRowProps) {
  const queryClient = useQueryClient();
  const { play } = usePlayer();
  const coverUrl = song.coverUrl || getCoverImageUrl(song.storageKey, 'small', true) || null;

  const [liked, setLiked] = useState(!!song.isLiked);

  useEffect(() => {
    // Only update if the backend provides a definite boolean value
    if (typeof song.isLiked === 'boolean') {
      setLiked(song.isLiked);
    }
  }, [song.isLiked]);

  const favMutation = useMutation({
    mutationFn: (wasLiked: boolean) =>
      wasLiked ? musicApi.removeFavourite(song.id) : musicApi.addFavourite(song.id),
    onMutate: () => {
      setLiked((prev) => !prev);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites'] });
      queryClient.invalidateQueries({ queryKey: ['favourite-check'] });
    },
    onError: (error: any) => {
      setLiked((prev) => !prev);
      if (error.response?.status === 409) {
        Alert.alert('Already exists', 'Song already in favourites');
        queryClient.invalidateQueries({ queryKey: ['favourites'] });
      } else {
        Alert.alert('Error', 'Failed to update favourites');
      }
    },
  });

  const openPlayer = () => {
    // Generate a high-quality cover for the full-screen player
    const largeCoverUrl = song.coverUrl || getCoverImageUrl(song.storageKey, 'large', true) || null;
    play({
      id: song.id,
      title: song.title,
      artistName: song.artistName,
      storageKey: song.storageKey,
      coverUrl: largeCoverUrl,
    });
    if (onPress) onPress();
  };

  return (
    <Pressable
      onPress={openPlayer}
      className="flex-row items-center gap-4 rounded-[20px] px-4 py-3.5 active:bg-white/[0.04]">
      <Text className="w-6 text-center text-xs font-black text-zinc-700">
        {String(index + 1).padStart(2, '0')}
      </Text>

      <View className="h-14 w-14 overflow-hidden rounded-2xl bg-white/[0.03] shadow-lg">
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center bg-primary/10">
            <Ionicons name="musical-notes" size={24} color="#00FF85" />
          </View>
        )}
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[16px] font-black tracking-tight text-white" numberOfLines={1}>
          {capitalize(song.title)}
        </Text>
        <Text className="mt-0.5 text-xs font-bold text-zinc-400" numberOfLines={1}>
          {capitalize(song.artistName)}
        </Text>
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          favMutation.mutate(liked);
        }}
        disabled={favMutation.isPending}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-white/[0.05]"
        hitSlop={8}>
        {favMutation.isPending ? (
          <ActivityIndicator color="#00FF85" size="small" />
        ) : (
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? '#ef4444' : '#3f3f46'}
          />
        )}
      </Pressable>
    </Pressable>
  );
}
