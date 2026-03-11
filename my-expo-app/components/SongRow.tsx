import { useState, useEffect } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getCoverImageUrl } from '../lib/s3';
import { capitalize } from '../lib/utils';
import { musicApi } from '../lib/api';
import { usePlayer } from '../lib/player-context';

interface SongRowProps {
  song: any;
  index: number;
}

export default function SongRow({ song, index }: SongRowProps) {
  const queryClient = useQueryClient();
  const { play } = usePlayer();
  const coverUrl = song.coverUrl || getCoverImageUrl(song.storageKey, 'small', true) || null;

  // Local optimistic state for the heart icon
  const [liked, setLiked] = useState(!!song.isLiked);

  // Sync state with props when data is refetched
  useEffect(() => {
    setLiked(!!song.isLiked);
  }, [song.isLiked]);

  const favMutation = useMutation({
    mutationFn: () => (liked ? musicApi.removeFavourite(song.id) : musicApi.addFavourite(song.id)),
    onMutate: () => {
      // Optimistic update
      setLiked((prev) => !prev);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites'] });
    },
    onError: () => {
      // Revert on failure
      setLiked((prev) => !prev);
    },
  });

  const openPlayer = () => {
    play({
      id: song.id,
      title: song.title,
      artistName: song.artistName,
      storageKey: song.storageKey,
      coverUrl,
    });
    // Navigation is now handled inside play() context
  };

  return (
    <Pressable
      onPress={openPlayer}
      className="flex-row items-center gap-3 rounded-2xl px-4 py-3 active:bg-white/5">
      {/* Index */}
      <Text className="w-7 text-center text-xs font-bold text-zinc-600">
        {String(index + 1).padStart(2, '0')}
      </Text>

      {/* Cover */}
      <View className="h-14 w-14 overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="musical-notes" size={20} color="#3f3f46" />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-bold text-white" numberOfLines={1}>
          {capitalize(song.title)}
        </Text>
        <Text className="mt-0.5 text-xs font-semibold text-zinc-500" numberOfLines={1}>
          {capitalize(song.artistName)}
        </Text>
      </View>

      {/* Favourite Button with optimistic + loading state */}
      <Pressable
        onPress={() => favMutation.mutate()}
        disabled={favMutation.isPending}
        className="h-9 w-9 items-center justify-center rounded-full"
        hitSlop={8}>
        {favMutation.isPending ? (
          <ActivityIndicator color="#22c55e" size="small" />
        ) : (
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#ef4444' : '#52525b'}
          />
        )}
      </Pressable>
    </Pressable>
  );
}
