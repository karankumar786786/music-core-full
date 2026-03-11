import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import { usePlayer } from '../../lib/player-context';
import SongRow from '../../components/SongRow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Home() {
  // ── Data fetching ──
  const {
    data: featuredData,
    isLoading: featuredLoading,
    refetch: refetchFeatured,
  } = useQuery({
    queryKey: ['featured'],
    queryFn: () => musicApi.getFeatured(),
  });

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => musicApi.getTrending(),
  });

  const { data: artistsData, isLoading: artistsLoading } = useQuery({
    queryKey: ['artists'],
    queryFn: () => musicApi.getArtists(),
  });

  const { data: playlistsData, isLoading: playlistsLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => musicApi.getPlaylists(),
  });

  const {
    data: songsData,
    isLoading: songsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['songs'],
    queryFn: ({ pageParam = 1 }) => musicApi.getSongs(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.data || lastPage.data.length < 20) return undefined;
      return (lastPage.meta?.page ?? 0) + 1;
    },
  });

  const allSongs = songsData?.pages?.flatMap((page) => page.data || []) || [];

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchFeatured();
    setRefreshing(false);
  }, []);

  // ── Sections ──
  const { play } = usePlayer();

  const renderFeatured = () => {
    const featured = featuredData?.data || [];
    if (featuredLoading) {
      return (
        <View className="mb-8 px-4">
          <View className="h-56 animate-pulse rounded-3xl bg-zinc-900" />
        </View>
      );
    }
    if (featured.length === 0) return null;

    const item = featured[0];
    const coverUrl = item.coverUrl || getCoverImageUrl(item.storageKey, 'large', true) || null;

    return (
      <View className="mb-8 px-4">
        <Pressable
          onPress={() =>
            play({
              id: item.id,
              title: item.title,
              artistName: item.artistName,
              storageKey: item.storageKey,
              coverUrl,
            })
          }>
          <View className="h-56 overflow-hidden rounded-3xl border border-white/5 bg-zinc-900">
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center bg-green-500/10">
                <Ionicons name="musical-notes" size={56} color="#22c55e" />
              </View>
            )}
            <View className="absolute bottom-0 left-0 right-0 flex-row items-center bg-black/70 px-5 py-4">
              <View className="mr-4 flex-1">
                <Text className="text-xl font-black tracking-tight text-white" numberOfLines={1}>
                  {capitalize(item.title)}
                </Text>
                <Text className="mt-0.5 text-sm font-semibold text-zinc-400" numberOfLines={1}>
                  {capitalize(item.artistName)}
                </Text>
              </View>
              <View className="h-14 w-14 items-center justify-center rounded-full bg-green-500">
                <Ionicons name="play" size={28} color="#000" style={{ marginLeft: 3 }} />
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  const renderArtists = () => {
    const artists = artistsData?.data || [];
    if (artistsLoading) {
      return (
        <View className="mb-8 px-4">
          <View className="h-40 animate-pulse rounded-xl bg-zinc-900" />
        </View>
      );
    }
    if (artists.length === 0) return null;

    return (
      <View className="mb-8">
        <Text className="mb-4 px-4 text-xl font-black tracking-tight text-white">Top Artists</Text>
        <FlatList
          data={artists.slice(0, 15)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const avatarUrl = getCoverImageUrl(item.storageKey, 'medium') || null;
            return (
              <Pressable
                className="w-32 items-center"
                onPress={() => router.push(`/artist/${item.id}`)}>
                <View className="mb-3 h-32 w-32 overflow-hidden rounded-2xl border-2 border-green-500/20 bg-zinc-800">
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-green-500/10">
                      <Ionicons name="person" size={40} color="#22c55e" />
                    </View>
                  )}
                </View>
                <Text className="text-center text-sm font-bold text-white" numberOfLines={1}>
                  {capitalize(item.artistName || item.name)}
                </Text>
                <Text className="mt-0.5 text-center text-xs font-semibold text-zinc-500">
                  Artist
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    );
  };

  const renderPlaylists = () => {
    const playlists = playlistsData?.data || [];
    if (playlistsLoading) {
      return (
        <View className="mb-8 px-4">
          <View className="h-36 animate-pulse rounded-xl bg-zinc-900" />
        </View>
      );
    }
    if (playlists.length === 0) return null;

    return (
      <View className="mb-8">
        <Text className="mb-4 px-4 text-xl font-black tracking-tight text-white">Playlists</Text>
        <FlatList
          data={playlists}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const coverUrl =
              getCoverImageUrl(item.storageKey, 'medium') ||
              getCoverImageUrl(item.storageKey, 'small') ||
              null;
            return (
              <Pressable className="w-40" onPress={() => router.push(`/playlist/${item.id}`)}>
                <View className="mb-2 h-40 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900">
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-zinc-800">
                      <Ionicons name="musical-notes" size={36} color="#3f3f46" />
                    </View>
                  )}
                </View>
                <Text className="text-sm font-bold text-white" numberOfLines={1}>
                  {capitalize(item.title)}
                </Text>
                <Text className="text-xs font-semibold text-zinc-500">
                  {item.songs?.length || 0} songs
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    );
  };

  const renderTrending = () => {
    const trending = trendingData?.data || [];
    if (trendingLoading) {
      return (
        <View className="mb-8 px-4">
          <View className="h-44 animate-pulse rounded-xl bg-zinc-900" />
        </View>
      );
    }
    if (trending.length === 0) return null;

    return (
      <View className="mb-8">
        <Text className="mb-4 px-4 text-xl font-black tracking-tight text-white">
          🔥 Trending Now
        </Text>
        <FlatList
          data={trending.slice(0, 10)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          keyExtractor={(item) => item.id}
          decelerationRate="fast"
          snapToInterval={188}
          snapToAlignment="start"
          renderItem={({ item }) => {
            const coverUrl =
              item.coverUrl || getCoverImageUrl(item.storageKey, 'medium', true) || null;
            return (
              <Pressable
                className="w-44"
                onPress={() =>
                  play({
                    id: item.id,
                    title: item.title,
                    artistName: item.artistName,
                    storageKey: item.storageKey,
                    coverUrl,
                  })
                }>
                <View className="mb-2 h-44 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900">
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-zinc-800">
                      <Ionicons name="flame" size={40} color="#f97316" />
                    </View>
                  )}
                </View>
                <Text className="text-sm font-bold text-white" numberOfLines={1}>
                  {capitalize(item.title)}
                </Text>
                <Text className="text-xs font-semibold text-zinc-500" numberOfLines={1}>
                  {capitalize(item.artistName)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    );
  };

  // ── Header ──
  const renderHeader = () => (
    <View>
      {/* Search Bar */}
      <Pressable
        onPress={() => router.push('/search')}
        className="mx-4 mb-6 mt-4 h-12 flex-row items-center rounded-2xl border border-white/10 bg-zinc-900 px-4 active:bg-zinc-800">
        <Ionicons name="search" size={18} color="#71717a" />
        <Text className="ml-3 flex-1 text-base text-zinc-500">Search songs, artists...</Text>
      </Pressable>

      {renderFeatured()}
      {renderArtists()}
      {renderPlaylists()}
      {renderTrending()}

      {/* Songs Section Header */}
      <View className="mb-2 flex-row items-center justify-between border-b border-white/5 px-4 pb-3">
        <Text className="text-xl font-black tracking-tight text-white">All Songs</Text>
      </View>
    </View>
  );

  // ── Main List ──
  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <FlatList
        data={allSongs}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <SongRow song={item} index={index} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          songsLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#22c55e" size="large" />
            </View>
          ) : (
            <View className="items-center py-20">
              <Text className="text-base text-zinc-500">No songs yet</Text>
            </View>
          )
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}
