import { View, Text, FlatList, Image, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import { usePlayer } from '../../lib/player-context';
import { useMemo, useCallback } from 'react';

export default function UserPlaylistDetail() {
  const { userPlaylistId } = useLocalSearchParams<{ userPlaylistId: string }>();
  const { play, playAll } = usePlayer();
  const queryClient = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['userPlaylist', userPlaylistId],
    queryFn: ({ pageParam = 1 }) => musicApi.getUserPlaylist(userPlaylistId!, pageParam, 50),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.songs?.data || lastPage.songs.data.length < 50) return undefined;
      return (lastPage.songs?.meta?.page ?? 0) + 1;
    },
    enabled: !!userPlaylistId,
  });

  const playlist = data?.pages?.[0];
  const allSongsData = data?.pages?.flatMap((page) => page.songs?.data || []) || [];
  const songs = allSongsData.map((item: any) => item.song || item).filter(Boolean);

  const coverUrl = playlist ? getCoverImageUrl(playlist.storageKey, 'large') || null : null;

  const handlePlayAll = useCallback(() => {
    if (songs.length === 0) return;
    const playerSongs = songs.map((s: any) => ({
      id: s.id,
      title: s.title,
      artistName: s.artistName,
      storageKey: s.storageKey,
      coverUrl: getCoverImageUrl(s.storageKey, 'large', true) || null,
    }));
    playAll(playerSongs);
  }, [songs, playAll]);

  const MemoizedHeader = useMemo(() => {
    if (!playlist) return null;
    return (
      <View>
        {/* Back + Title */}
        <View className="flex-row items-center gap-4 px-6 py-4 pt-12">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60">
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-sm font-bold uppercase tracking-widest text-primary">
              Playlist
            </Text>
            <Text className="text-3xl font-black tracking-tight text-white" numberOfLines={1}>
              {capitalize(playlist.title)}
            </Text>
          </View>
        </View>

        {/* Cover + Basic Info */}
        <View className="px-6 pb-6">
          <View className="flex-row items-end gap-6">
            <View className="h-40 w-40 overflow-hidden rounded-3xl border-2 border-primary/30 bg-zinc-800 shadow-2xl">
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center bg-primary/10">
                  <Ionicons name="musical-notes" size={60} color="#22c55e" />
                </View>
              )}
            </View>
          </View>

          {/* Play All Button */}
          {songs.length > 0 && (
            <Pressable
              onPress={handlePlayAll}
              className="mt-8 h-14 flex-row items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/20 active:opacity-90">
              <Ionicons name="play" size={22} color="#000" style={{ marginLeft: 2 }} />
              <Text className="ml-2 text-lg font-black text-black">Play All</Text>
            </Pressable>
          )}
        </View>

        {/* Tracks info Header */}
        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between border-b border-white/5 pb-2">
            <Text className="text-lg font-black tracking-tight text-white">Tracks</Text>
            <Text className="text-xs font-bold text-zinc-600">{songs.length} total</Text>
          </View>
        </View>
      </View>
    );
  }, [playlist, songs, coverUrl, handlePlayAll]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#22c55e" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <FlatList
        data={songs}
        keyExtractor={(item, index) => item?.id || `song-${index}`}
        renderItem={({ item, index }) => (
          <PlaylistSongRow song={item} index={index} playlistId={userPlaylistId!} />
        )}
        ListHeaderComponent={MemoizedHeader}
        ListEmptyComponent={
          <View className="items-center py-20">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full border border-white/5 bg-zinc-900/60">
              <Ionicons name="musical-notes" size={32} color="#3f3f46" />
            </View>
            <Text className="text-base font-bold text-zinc-400">No songs yet</Text>
            <Text className="mt-2 px-12 text-center text-sm text-zinc-600">
              Add songs from the home page to fill your playlist
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-6">
              <ActivityIndicator color="#22c55e" />
            </View>
          ) : null
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}

function PlaylistSongRow({
  song,
  index,
  playlistId,
}: {
  song: any;
  index: number;
  playlistId: string;
}) {
  const queryClient = useQueryClient();
  const { play } = usePlayer();
  const coverUrl = getCoverImageUrl(song.storageKey, 'small', true) || null;

  const removeMutation = useMutation({
    mutationFn: () => musicApi.removeSongFromUserPlaylist(playlistId, song.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
    onError: () => Alert.alert('Error', 'Failed to remove song'),
  });

  const handleRemove = () => {
    Alert.alert('Remove Song', `Remove "${song.title}" from this playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate() },
    ]);
  };

  return (
    <Pressable
      onPress={() =>
        play({
          id: song.id,
          title: song.title,
          artistName: song.artistName,
          storageKey: song.storageKey,
          coverUrl,
        })
      }
      className="flex-row items-center gap-4 rounded-[20px] px-4 py-3.5 active:bg-white/[0.04]">
      <Text className="w-6 text-center text-xs font-black text-zinc-700">
        {String(index + 1).padStart(2, '0')}
      </Text>

      <View className="h-14 w-14 overflow-hidden rounded-xl bg-zinc-900 shadow-sm">
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center bg-primary/5">
            <Ionicons name="musical-notes" size={24} color="#08f808" />
          </View>
        )}
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-black tracking-tight text-white" numberOfLines={1}>
          {capitalize(song.title)}
        </Text>
        <Text className="mt-0.5 text-xs font-bold text-zinc-500" numberOfLines={1}>
          {capitalize(song.artistName)}
        </Text>
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
        disabled={removeMutation.isPending}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-red-500/10"
        hitSlop={8}>
        {removeMutation.isPending ? (
          <ActivityIndicator color="#ef4444" size="small" />
        ) : (
          <Ionicons name="trash-outline" size={18} color="#71717a" />
        )}
      </Pressable>
    </Pressable>
  );
}
