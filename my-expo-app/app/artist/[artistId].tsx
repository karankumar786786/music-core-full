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
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl, getBannerImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import { usePlayer } from '../../lib/player-context';
import SongRow from '../../components/SongRow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ArtistDetail() {
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const { play } = usePlayer();

  const { data: artist, isLoading: isArtistLoading } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => musicApi.getArtist(artistId!),
    enabled: !!artistId,
  });

  const {
    data: songsData,
    isLoading: isSongsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['artist-songs', artistId],
    queryFn: ({ pageParam = 1 }) => musicApi.getArtistSongs(artistId!, pageParam, 50),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.data || lastPage.data.length < 50) return undefined;
      return (lastPage.meta?.page ?? 0) + 1;
    },
    enabled: !!artistId,
  });

  const songs = songsData?.pages?.flatMap((page) => page.data || []) || [];
  const totalTracks = songsData?.pages?.[0]?.meta?.totalItems || songs.length;

  if (isArtistLoading || isSongsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top']}>
        {/* Skeleton header */}
        <View className="flex-row items-center gap-3 px-5 pb-4 pt-2">
          <View className="h-10 w-10 rounded-full bg-zinc-900" />
          <View className="h-5 w-32 rounded bg-zinc-900" />
        </View>
        <View className="mx-5 mb-6 h-60 rounded-3xl bg-zinc-900" />
        <View className="mt-2 gap-3 px-5">
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

  if (!artist) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <Text className="text-base text-zinc-500">Artist not found</Text>
      </SafeAreaView>
    );
  }

  const avatarUrl = getCoverImageUrl(artist.storageKey, 'large') || null;
  const bannerUrl = getBannerImageUrl(artist.storageKey, 'large') || null;

  const renderHeader = () => (
    <View>
      {/* Back button */}
      <View className="absolute left-4 top-2 z-10">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60">
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Hero Banner - Full width */}
      <View className="h-64 w-full overflow-hidden bg-zinc-900">
        {bannerUrl ? (
          <Image source={{ uri: bannerUrl }} className="h-full w-full" resizeMode="cover" />
        ) : avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-full w-full"
            resizeMode="cover"
            blurRadius={20}
            style={{ opacity: 0.5 }}
          />
        ) : (
          <View className="h-full w-full bg-green-500/10" />
        )}
        {/* Dark gradient overlay */}
        <View className="absolute inset-0 bg-black/40" />
      </View>

      {/* Artist info card overlapping banner */}
      <View className="mx-5 -mt-20 mb-6">
        <View className="rounded-3xl border border-white/10 bg-zinc-950/90 p-5">
          <View className="flex-row items-center gap-4">
            {/* Avatar */}
            <View className="h-24 w-24 overflow-hidden rounded-2xl border-2 border-green-500/30 bg-zinc-800">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center bg-green-500/10">
                  <Text className="text-3xl font-black text-green-500">
                    {artist.artistName?.[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-green-500">
                Artist
              </Text>
              <Text className="text-2xl font-black tracking-tight text-white" numberOfLines={2}>
                {capitalize(artist.artistName)}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-zinc-400">{totalTracks} tracks</Text>
            </View>
          </View>

          {/* Bio */}
          {artist.bio && (
            <View className="mt-4 border-t border-white/5 pt-4">
              <Text className="text-sm leading-5 text-zinc-400">{artist.bio}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Play All */}
      {songs.length > 0 && (
        <Pressable
          onPress={() => {
            const first = songs[0];
            const coverUrl = getCoverImageUrl(first.storageKey, 'small', true) || null;
            play({
              id: first.id,
              title: first.title,
              artistName: first.artistName,
              storageKey: first.storageKey,
              coverUrl,
            });
          }}
          className="mx-5 mb-4 h-12 flex-row items-center justify-center rounded-full bg-green-500 active:opacity-80">
          <Ionicons name="play" size={20} color="#000" style={{ marginLeft: 2 }} />
          <Text className="ml-2 text-base font-black text-black">Play All</Text>
        </Pressable>
      )}

      {/* Section Header */}
      <View className="mx-5 mb-2 flex-row items-center justify-between pb-2">
        <Text className="text-lg font-black tracking-tight text-white">Popular Tracks</Text>
        <Text className="text-xs font-bold text-zinc-600">{totalTracks} total</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <SongRow song={item} index={index} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View className="items-center py-20">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full border border-white/5 bg-zinc-900/60">
              <Ionicons name="musical-notes" size={32} color="#3f3f46" />
            </View>
            <Text className="text-base font-bold text-zinc-400">No tracks found</Text>
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
