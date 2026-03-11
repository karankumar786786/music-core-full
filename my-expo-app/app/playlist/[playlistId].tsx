import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import SongRow from '../../components/SongRow';
import { usePlayer } from '../../lib/player-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlaylistDetail() {
  const { playlistId } = useLocalSearchParams<{ playlistId: string }>();
  const { play } = usePlayer();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['playlist', playlistId],
    queryFn: ({ pageParam = 1 }) => musicApi.getPlaylist(playlistId!, pageParam, 50),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.songs?.data || lastPage.songs.data.length < 50) return undefined;
      return (lastPage.songs?.meta?.page ?? 0) + 1;
    },
    enabled: !!playlistId,
  });

  const playlist = data?.pages?.[0];
  const allSongsData = data?.pages?.flatMap((page) => page.songs?.data || []) || [];
  const songs = allSongsData.map((item: any) => item.song || item).filter(Boolean);
  const totalTracks = data?.pages?.[0]?.songs?.meta?.totalItems || songs.length;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top']}>
        {/* Skeleton header */}
        <View className="flex-row items-center gap-3 px-5 pb-4 pt-2">
          <View className="h-10 w-10 rounded-full bg-zinc-900" />
          <View className="h-5 w-32 rounded bg-zinc-900" />
        </View>
        <View className="mb-6 items-center">
          <View className="h-48 w-48 rounded-3xl bg-zinc-900" />
          <View className="mt-4 h-6 w-40 rounded bg-zinc-900" />
          <View className="mt-2 h-4 w-20 rounded bg-zinc-900" />
        </View>
        <View className="gap-3 px-4">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="flex-row items-center gap-3 px-4 py-3">
              <View className="h-4 w-7 rounded bg-zinc-900" />
              <View className="h-14 w-14 rounded-xl bg-zinc-900" />
              <View className="flex-1 gap-2">
                <View className="h-4 w-3/4 rounded bg-zinc-900" />
                <View className="h-3 w-1/2 rounded bg-zinc-900" />
              </View>
            </View>
          ))}
        </View>
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
      {/* Back + Title Row */}
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
          <Text className="text-xs font-semibold text-zinc-500">Playlist</Text>
        </View>
      </View>

      {/* Centered Album Art */}
      <View className="mb-6 items-center">
        <View className="mb-5 h-52 w-52 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center bg-green-500/5">
              <Ionicons name="albums" size={64} color="#22c55e" />
            </View>
          )}
        </View>
        <Text
          className="px-8 text-center text-2xl font-black tracking-tight text-white"
          numberOfLines={2}>
          {capitalize(playlist.title)}
        </Text>
        {playlist.description && (
          <Text
            className="mt-2 px-12 text-center text-sm font-medium text-zinc-500"
            numberOfLines={2}>
            {playlist.description}
          </Text>
        )}
        <View className="mt-3 flex-row items-center gap-4">
          <Text className="text-xs font-bold text-zinc-400">{totalTracks} tracks</Text>
          <View className="h-1 w-1 rounded-full bg-zinc-600" />
          <Text className="text-xs font-bold uppercase tracking-wider text-green-500/80">
            Playlist
          </Text>
        </View>

        {/* Play All Button */}
        <Pressable
          onPress={() => {
            if (songs.length > 0) {
              const first = songs[0];
              const cUrl = getCoverImageUrl(first.storageKey, 'small', true) || null;
              play({
                id: first.id,
                title: first.title,
                artistName: first.artistName,
                storageKey: first.storageKey,
                coverUrl: cUrl,
              });
            }
          }}
          className="mt-5 h-12 w-40 flex-row items-center justify-center rounded-full bg-green-500 active:opacity-80">
          <Ionicons name="play" size={20} color="#000" style={{ marginLeft: 2 }} />
          <Text className="ml-2 text-base font-black text-black">Play All</Text>
        </Pressable>
      </View>

      {/* Section Header */}
      <View className="mx-5 mb-2 flex-row items-center justify-between border-b border-white/5 pb-2">
        <Text className="text-lg font-black tracking-tight text-white">Tracks</Text>
        <Text className="text-xs font-bold text-zinc-600">{totalTracks} total</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <FlatList
        data={songs}
        keyExtractor={(item, index) => item?.id || `song-${index}`}
        renderItem={({ item, index }) => <SongRow song={item} index={index} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View className="items-center py-20">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full border border-white/5 bg-zinc-900/60">
              <Ionicons name="musical-notes" size={32} color="#3f3f46" />
            </View>
            <Text className="text-base font-bold text-zinc-400">No tracks yet</Text>
            <Text className="mt-2 px-12 text-center text-sm text-zinc-600">
              This playlist is empty
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
