import React, { useCallback, useRef, useEffect } from 'react';
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
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import { usePlayer } from '../../lib/player-context';
import { playerActions, PlayerSong } from '../../lib/player-store';
import SongRow from '../../components/SongRow';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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

  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => musicApi.getFeed(),
    staleTime: 5 * 60 * 1000,
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

  // Sync data to player global store
  useEffect(() => {
    const feedSongs = feedData?.data || [];
    const trendSongs = trendingData?.data || [];

    // Choose what to sync: prioritize Personalized Feed if available
    const activeData = feedSongs.length > 0 ? feedSongs : trendSongs;

    if (activeData.length > 0) {
      const playerSongs: PlayerSong[] = activeData.map((s: any) => ({
        id: s.id,
        title: s.title,
        artistName: s.artistName,
        storageKey: s.storageKey,
        coverUrl: getCoverImageUrl(s.storageKey, 'large', true) || null,
      }));
      playerActions.syncFeedToQueue(playerSongs);
    }
  }, [feedData, trendingData]);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchFeatured();
    setRefreshing(false);
  }, []);

  // ── Sections ──
  const { play, addToQueue } = usePlayer();

  // Auto-sliding featured carousel
  const featuredRef = useRef<FlatList>(null);
  const [featuredIndex, setFeaturedIndex] = React.useState(0);
  const featuredCount = (featuredData?.data || []).slice(0, 8).length;

  useEffect(() => {
    if (featuredCount <= 1) return;
    const timer = setInterval(() => {
      setFeaturedIndex((prev) => {
        const next = (prev + 1) % featuredCount;
        featuredRef.current?.scrollToOffset({
          offset: next * (SCREEN_WIDTH - 32),
          animated: true,
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [featuredCount]);

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

    return (
      <View className="mb-8">
        <FlatList
          ref={featuredRef}
          data={featured.slice(0, 8)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const coverUrl =
              item.coverUrl || getCoverImageUrl(item.storageKey, 'large', true) || null;
            return (
              <Pressable
                style={{ width: SCREEN_WIDTH - 32 }}
                className="mx-4"
                onPress={() =>
                  play({
                    id: item.id,
                    title: item.title,
                    artistName: item.artistName,
                    storageKey: item.storageKey,
                    coverUrl,
                  })
                }>
                <View className="h-56 overflow-hidden rounded-[32px] border border-white/[0.08] bg-white/[0.03] shadow-2xl shadow-black/50">
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-green-500/10">
                      <Ionicons name="musical-notes" size={56} color="#22c55e" />
                    </View>
                  )}
                  <View className="absolute bottom-0 left-0 right-0 flex-row items-center bg-black/60 px-6 py-5">
                    <View className="mr-4 flex-1">
                      <Text
                        className="text-2xl font-black tracking-tighter text-white"
                        numberOfLines={1}>
                        {capitalize(item.title)}
                      </Text>
                      <Text className="mt-1 text-sm font-bold text-zinc-300" numberOfLines={1}>
                        {capitalize(item.artistName)}
                      </Text>
                    </View>
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/20">
                      <Ionicons name="play" size={28} color="#000" style={{ marginLeft: 3 }} />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
        {/* Page dots */}
        {featured.length > 1 && (
          <View className="mt-3 flex-row items-center justify-center gap-1.5">
            {featured.slice(0, 8).map((_: any, i: any) => (
              <View
                key={i}
                className={`h-1.5 rounded-full ${
                  i === featuredIndex ? 'w-8 bg-primary' : 'w-1.5 bg-white/10'
                }`}
              />
            ))}
          </View>
        )}
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
        <Text className="mb-5 px-6 text-2xl font-black tracking-tighter text-white">
          Top Artists
        </Text>
        <FlatList
          data={artists.slice(0, 15)}
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const avatarUrl = getCoverImageUrl(item.storageKey, 'medium') || null;
            return (
              <Pressable
                className="w-32 items-center"
                onPress={() => router.push(`/artist/${item.id}`)}>
                <View className="mb-4 h-28 w-28 overflow-hidden rounded-full border-2 border-white/[0.05] bg-white/[0.03] shadow-lg">
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
        <Text className="mb-5 px-6 text-2xl font-black tracking-tighter text-white">Playlists</Text>
        <FlatList
          data={playlists}
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const coverUrl =
              getCoverImageUrl(item.storageKey, 'medium') ||
              getCoverImageUrl(item.storageKey, 'small') ||
              null;
            return (
              <Pressable className="w-40" onPress={() => router.push(`/playlist/${item.id}`)}>
                <View className="mb-3 h-40 overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.03] shadow-lg">
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
        <Text className="mb-5 px-6 text-2xl font-black tracking-tighter text-white">
          🔥 Trending Now
        </Text>
        <FlatList
          data={trending.slice(0, 10)}
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const coverUrl =
              item.coverUrl || getCoverImageUrl(item.storageKey, 'medium', true) || null;
            const largeCoverUrl =
              item.coverUrl || getCoverImageUrl(item.storageKey, 'large', true) || null;
            return (
              <Pressable
                className="w-44"
                onPress={() =>
                  play({
                    id: item.id,
                    title: item.title,
                    artistName: item.artistName,
                    storageKey: item.storageKey,
                    coverUrl: largeCoverUrl,
                  })
                }>
                <View className="mb-3 h-44 overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.03] shadow-lg">
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

  const renderDiscoverForYou = () => {
    const feedSongs = feedData?.data || [];
    if (feedLoading) {
      return (
        <View className="mb-8 px-4">
          <View className="h-44 animate-pulse rounded-xl bg-zinc-900" />
        </View>
      );
    }
    if (feedSongs.length === 0) return null;

    return (
      <View className="mb-8">
        <View className="mb-5 flex-row items-center gap-3 px-6">
          <Ionicons name="sparkles" size={24} color="#00FF85" />
          <Text className="text-2xl font-black tracking-tighter text-white">Discover For You</Text>
        </View>
        <FlatList
          data={feedSongs.slice(0, 15)}
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const coverUrl =
              item.coverUrl || getCoverImageUrl(item.storageKey, 'medium', true) || null;
            const largeCoverUrl =
              item.coverUrl || getCoverImageUrl(item.storageKey, 'large', true) || null;
            return (
              <Pressable
                className="w-40"
                onPress={() =>
                  play({
                    id: item.id,
                    title: item.title,
                    artistName: item.artistName,
                    storageKey: item.storageKey,
                    coverUrl: largeCoverUrl,
                  })
                }>
                <View className="mb-3 h-40 overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.03] shadow-lg">
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-green-500/5">
                      <Ionicons name="sparkles" size={36} color="#00FF85" />
                    </View>
                  )}
                  <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2">
                    <Text className="text-xs font-bold text-green-400">For You</Text>
                  </View>
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
      {renderFeatured()}
      {renderArtists()}
      {renderPlaylists()}
      {renderTrending()}
      {renderDiscoverForYou()}

      {/* Songs Section Header */}
      <View className="mb-4 flex-row items-center justify-between border-b border-white/[0.05] px-6 pb-4">
        <Text className="text-2xl font-black tracking-tighter text-white">All Songs</Text>
      </View>
    </View>
  );

  // ── Main List ──
  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <LinearGradient
        colors={['#1a1a1a', '#050505']}
        className="absolute inset-0"
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
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
