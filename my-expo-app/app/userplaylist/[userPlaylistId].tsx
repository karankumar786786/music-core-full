import { View, Text, FlatList, Image, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import { usePlayer } from '../../lib/player-context';

export default function UserPlaylistDetail() {
  const { userPlaylistId } = useLocalSearchParams<{ userPlaylistId: string }>();
  const { play } = usePlayer();
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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#22c55e" size="large" />
      </SafeAreaView>
    );
  }

  if (!playlist) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <Text className="text-base text-zinc-500">Playlist not found</Text>
      </SafeAreaView>
    );
  }

  const coverUrl = getCoverImageUrl(playlist.storageKey, 'large') || null;

  const renderHeader = () => (
    <View>
      {/* Back + Title */}
      <View className="flex-row items-center gap-3 px-5 pb-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80">
          <Ionicons name="arrow-back" size={20} color="#a1a1aa" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-black tracking-tight text-white" numberOfLines={1}>
            {capitalize(playlist.title)}
          </Text>
          <Text className="text-xs font-semibold text-zinc-500">My Playlist</Text>
        </View>
      </View>

      {/* Cover Art Hero */}
      <View className="mx-5 mb-6 items-center">
        <View className="mb-4 h-48 w-48 overflow-hidden rounded-3xl border border-white/5 bg-zinc-900">
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center bg-green-500/5">
              <Ionicons name="musical-notes" size={60} color="#22c55e" />
            </View>
          )}
        </View>
        <Text
          className="text-center text-2xl font-black tracking-tight text-white"
          numberOfLines={2}>
          {capitalize(playlist.title)}
        </Text>
        <Text className="mt-1 text-sm font-semibold text-zinc-500">{songs.length} tracks</Text>

        {/* Play All Button */}
        {songs.length > 0 && (
          <Pressable
            onPress={() => {
              const first = songs[0];
              const cUrl = getCoverImageUrl(first.storageKey, 'small', true) || null;
              play({
                id: first.id,
                title: first.title,
                artistName: first.artistName,
                storageKey: first.storageKey,
                coverUrl: cUrl,
              });
            }}
            className="mt-6 h-12 w-44 flex-row items-center justify-center rounded-full bg-green-500 active:opacity-80">
            <Ionicons name="play" size={20} color="#000" style={{ marginLeft: 2 }} />
            <Text className="ml-2 text-base font-black text-black">Play All</Text>
          </Pressable>
        )}
      </View>

      {/* Divider */}
      <View className="mx-5 mb-3 border-b border-white/5" />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <FlatList
        data={songs}
        keyExtractor={(item, index) => item?.id || `song-${index}`}
        renderItem={({ item, index }) => (
          <PlaylistSongRow song={item} index={index} playlistId={userPlaylistId!} />
        )}
        ListHeaderComponent={renderHeader}
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
          <View className="h-full w-full items-center justify-center bg-green-500/5">
            <Ionicons name="musical-notes" size={24} color="#00FF85" />
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
