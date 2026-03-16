import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
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
import { usePlayerActions } from '../../lib/player-context';
import { playerActions, PlayerSong } from '../../lib/player-store';
import SongRow from '../../components/SongRow';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Skeleton = ({ className }: { className: string }) => (
  <View className={`bg-white/[0.06] ${className}`} />
);

export default function Home() {
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

  useEffect(() => {
    const feedSongs = feedData?.data || [];
    const trendSongs = trendingData?.data || [];
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
  }, [refetchFeatured]);

  const { play } = usePlayerActions();

  // ── Featured carousel ──────────────────────────────────────────────────────
  const featuredScrollRef = useRef<ScrollView>(null);
  const [featuredIndex, setFeaturedIndex] = React.useState(0);
  const featured = (featuredData?.data || []).slice(0, 8);
  const featuredCount = featured.length;

  useEffect(() => {
    if (featuredCount <= 1) return;
    const timer = setInterval(() => {
      setFeaturedIndex((prev) => {
        const next = (prev + 1) % featuredCount;
        featuredScrollRef.current?.scrollTo({
          x: next * SCREEN_WIDTH,
          animated: true,
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [featuredCount]);

  // ── Section label ──────────────────────────────────────────────────────────
  const SectionLabel = ({ title, icon }: { title: string; icon?: string }) => (
    <View className="mb-5 flex-row items-center gap-2.5 px-6">
      <View className="h-5 w-1 rounded-full bg-primary" />
      {icon && <Ionicons name={icon as any} size={20} color="#08f808" />}
      <Text className="text-2xl font-black tracking-tighter text-white">{title}</Text>
    </View>
  );

  // ── Featured ───────────────────────────────────────────────────────────────
  const renderFeatured = () => {
    if (featuredLoading) {
      return (
        <View className="mb-10 px-6">
          <Skeleton className="h-[420px] rounded-[40px]" />
        </View>
      );
    }
    if (featured.length === 0) return null;

    return (
      <View className="mb-10">
        <ScrollView
          ref={featuredScrollRef}
          horizontal
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="start"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setFeaturedIndex(Math.max(0, Math.min(idx, featuredCount - 1)));
          }}>
          {featured.map((item: any, idx: number) => {
            const coverUrl =
              item.coverUrl || getCoverImageUrl(item.storageKey, 'large', true) || null;

            return (
              <Pressable
                key={item.id}
                style={{ width: SCREEN_WIDTH, paddingHorizontal: 20 }}
                onPress={() =>
                  play({
                    id: item.id,
                    title: item.title,
                    artistName: item.artistName,
                    storageKey: item.storageKey,
                    coverUrl,
                  })
                }>
                <View
                  style={{
                    height: 420,
                    borderRadius: 40,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.07)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 24 },
                    shadowOpacity: 0.8,
                    shadowRadius: 40,
                    elevation: 24,
                    backgroundColor: '#111',
                  }}>
                  {/* Full bleed artwork */}
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      style={{ position: 'absolute', width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(8,248,8,0.04)',
                      }}>
                      <Ionicons name="musical-notes" size={80} color="#08f808" />
                    </View>
                  )}

                  {/* Cinematic gradient */}
                  <LinearGradient
                    colors={[
                      'rgba(0,0,0,0.45)',
                      'transparent',
                      'transparent',
                      'rgba(0,0,0,0.65)',
                      'rgba(0,0,0,0.96)',
                    ]}
                    locations={[0, 0.15, 0.45, 0.72, 1]}
                    style={{ position: 'absolute', width: '100%', height: '100%' }}
                  />

                  {/* Top row */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 22,
                      left: 22,
                      right: 22,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    {/* Featured chip */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 13,
                        paddingVertical: 7,
                        borderRadius: 99,
                        backgroundColor: 'rgba(8,248,8,0)',
                        borderWidth: 1,
                        borderColor: 'rgba(8,248,8,0.28)',
                      }}>
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#08f808',
                          shadowColor: '#08f808',
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 1,
                          shadowRadius: 5,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '900',
                          letterSpacing: 1.5,
                          color: '#fff',
                          textTransform: 'uppercase',
                        }}>
                        Featured
                      </Text>
                    </View>
                  </View>

                  {/* Bottom info */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      paddingHorizontal: 24,
                      paddingBottom: 26,
                      paddingTop: 20,
                    }}>

                    {/* Title + play btn */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 28,
                            fontWeight: '900',
                            letterSpacing: -1,
                            color: '#fff',
                            lineHeight: 32,
                          }}
                          numberOfLines={1}>
                          {capitalize(item.title)}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 8,
                          }}>
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              overflow: 'hidden',
                              borderWidth: 1.5,
                              borderColor: 'rgba(8,248,8,0.45)',
                              backgroundColor: 'rgba(8,248,8,0.1)',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                            <Ionicons name="person" size={12} color="#08f808" />
                          </View>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: 'rgba(255,255,255,0.5)',
                              letterSpacing: 0.2,
                            }}
                            numberOfLines={1}>
                            {capitalize(item.artistName)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Progress dots only */}
        {featured.length > 1 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: 16,
            }}>
            {featured.map((_: any, i: number) => (
              <View
                key={i}
                style={{
                  height: 3,
                  width: i === featuredIndex ? 24 : 5,
                  borderRadius: 99,
                  backgroundColor:
                    i === featuredIndex ? '#08f808' : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  // ── Top Artists ────────────────────────────────────────────────────────────
  const renderArtists = useMemo(() => {
    const artists = artistsData?.data || [];
    if (artistsLoading) {
      return (
        <View className="mb-8">
          <View className="mb-5 px-6">
            <Skeleton className="h-7 w-36 rounded-lg" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
            {[...Array(5)].map((_, i) => (
              <View key={i} className="w-28 items-center gap-2">
                <Skeleton className="h-28 w-28 rounded-full" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }
    if (artists.length === 0) return null;

    return (
      <View className="mb-8">
        <SectionLabel title="Top Artists" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
          {artists.slice(0, 15).map((item: any) => {
            const avatarUrl = getCoverImageUrl(item.storageKey, 'medium') || null;
            return (
              <Pressable
                key={item.id}
                className="w-28 items-center active:opacity-70"
                onPress={() => router.push(`/artist/${item.id}`)}>
                <View
                  className="mb-3 h-28 w-28 overflow-hidden rounded-full"
                  style={{
                    borderWidth: 2,
                    borderColor: 'rgba(8,248,8,0.25)',
                    shadowColor: '#08f808',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    elevation: 6,
                  }}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-primary/10">
                      <Ionicons name="person" size={40} color="#08f808" />
                    </View>
                  )}
                </View>
                <Text
                  className="text-center text-[13px] font-bold leading-tight text-white"
                  numberOfLines={1}>
                  {capitalize(item.artistName || item.name)}
                </Text>
                <View className="mt-1.5 rounded-full bg-white/[0.06] px-2.5 py-0.5">
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Artist
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [artistsData, artistsLoading]);

  // ── Playlists ──────────────────────────────────────────────────────────────
  const renderPlaylists = useMemo(() => {
    const playlists = playlistsData?.data || [];
    if (playlistsLoading) {
      return (
        <View className="mb-8">
          <View className="mb-5 px-6">
            <Skeleton className="h-7 w-28 rounded-lg" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {[...Array(4)].map((_, i) => (
              <View key={i} className="w-40 gap-2">
                <Skeleton className="h-40 w-40 rounded-[24px]" />
                <Skeleton className="h-3.5 w-28 rounded" />
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }
    if (playlists.length === 0) return null;

    return (
      <View className="mb-8">
        <SectionLabel title="Playlists" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
          {playlists.map((item: any) => {
            const coverUrl =
              getCoverImageUrl(item.storageKey, 'medium') ||
              getCoverImageUrl(item.storageKey, 'small') ||
              null;
            return (
              <Pressable
                key={item.id}
                className="w-40 active:opacity-75"
                onPress={() => router.push(`/playlist/${item.id}`)}>
                <View
                  className="mb-3 h-40 overflow-hidden rounded-[24px]"
                  style={{
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.07)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 10,
                  }}>
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-zinc-800/80">
                      <Ionicons name="musical-notes" size={36} color="#3f3f46" />
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.5)']}
                    className="absolute bottom-0 left-0 right-0 h-1/2"
                  />
                </View>
                <Text
                  className="text-[13px] font-bold leading-tight text-white"
                  numberOfLines={1}>
                  {capitalize(item.title)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [playlistsData, playlistsLoading]);

  // ── Trending ───────────────────────────────────────────────────────────────
  const renderTrending = useMemo(() => {
    const trending = trendingData?.data || [];
    if (trendingLoading) {
      return (
        <View className="mb-8">
          <View className="mb-5 px-6">
            <Skeleton className="h-7 w-40 rounded-lg" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {[...Array(4)].map((_, i) => (
              <View key={i} className="w-44 gap-2">
                <Skeleton className="h-44 w-44 rounded-[28px]" />
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }
    if (trending.length === 0) return null;

    return (
      <View className="mb-8">
        <SectionLabel title="🔥 Trending Now" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
          {trending.slice(0, 10).map((item: any, index: number) => {
            const coverUrl =
              item.coverUrl || getCoverImageUrl(item.storageKey, 'medium', true) || null;
            const largeCoverUrl =
              item.coverUrl || getCoverImageUrl(item.storageKey, 'large', true) || null;
            return (
              <Pressable
                key={item.id}
                className="w-44 active:opacity-75"
                onPress={() =>
                  play({
                    id: item.id,
                    title: item.title,
                    artistName: item.artistName,
                    storageKey: item.storageKey,
                    coverUrl: largeCoverUrl,
                  })
                }>
                <View
                  className="mb-3 h-44 overflow-hidden rounded-[28px]"
                  style={{
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.07)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 10,
                  }}>
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-zinc-800/80">
                      <Ionicons name="flame" size={40} color="#f97316" />
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.55)']}
                    className="absolute inset-0"
                  />
                  <View className="absolute right-3 top-3 h-7 w-7 items-center justify-center rounded-full bg-black/60">
                    <Text className="text-[11px] font-black text-white/70">#{index + 1}</Text>
                  </View>
                </View>
                <Text
                  className="text-[13px] font-bold leading-tight text-white"
                  numberOfLines={1}>
                  {capitalize(item.title)}
                </Text>
                <Text className="mt-0.5 text-xs font-medium text-zinc-500" numberOfLines={1}>
                  {capitalize(item.artistName)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [trendingData, trendingLoading, play]);

  // ── Discover For You ───────────────────────────────────────────────────────
  const renderDiscoverForYou = useMemo(() => {
    const feedSongs = feedData?.data || [];
    if (feedLoading) {
      return (
        <View className="mb-8">
          <View className="mb-5 flex-row items-center gap-3 px-6">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-7 w-44 rounded-lg" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {[...Array(4)].map((_, i) => (
              <View key={i} className="w-40 gap-2">
                <Skeleton className="h-40 w-40 rounded-[24px]" />
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }
    if (feedSongs.length === 0) return null;

    return (
      <View className="mb-8">
        <View className="mb-5 flex-row items-center gap-2.5 px-6">
          <View className="h-5 w-1 rounded-full bg-primary" />
          <Ionicons name="sparkles" size={20} color="#08f808" />
          <Text className="text-2xl font-black tracking-tighter text-white">Discover For You</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
          {feedSongs.slice(0, 15).map((item: any) => {
            const coverUrl =
              item.coverUrl || getCoverImageUrl(item.storageKey, 'medium', true) || null;
            const largeCoverUrl =
              item.coverUrl || getCoverImageUrl(item.storageKey, 'large', true) || null;
            return (
              <Pressable
                key={item.id}
                className="w-40 active:opacity-75"
                onPress={() =>
                  play({
                    id: item.id,
                    title: item.title,
                    artistName: item.artistName,
                    storageKey: item.storageKey,
                    coverUrl: largeCoverUrl,
                  })
                }>
                <View
                  className="mb-3 h-40 overflow-hidden rounded-[24px]"
                  style={{
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.07)',
                    shadowColor: '#08f808',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 8,
                  }}>
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-primary/5">
                      <Ionicons name="sparkles" size={36} color="#08f808" />
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.5)']}
                    className="absolute bottom-0 left-0 right-0 h-1/2"
                  />
                </View>
                <Text
                  className="text-[13px] font-bold leading-tight text-white"
                  numberOfLines={1}>
                  {capitalize(item.title)}
                </Text>
                <Text className="mt-0.5 text-xs font-medium text-zinc-500" numberOfLines={1}>
                  {capitalize(item.artistName)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [feedData, feedLoading, play]);

  // ── Header ─────────────────────────────────────────────────────────────────
  const renderHeader = useMemo(
    () => (
      <View>
        {/* Branding bar */}
        <View className="flex-row items-center gap-3 px-6 pb-7 pt-5">
          <View
            className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/10"
            style={{
              borderWidth: 1,
              borderColor: 'rgba(8,248,8,0.18)',
            }}>
            <Image
              source={require('../../assets/logo.png')}
              className="h-7 w-7"
              resizeMode="contain"
            />
          </View>
          <View>
            <Text className="text-xl font-black tracking-tighter text-white">One Melody</Text>
            <Text className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/70">
              Your music universe
            </Text>
          </View>
        </View>

        {renderFeatured()}
        {renderArtists}
        {renderPlaylists}
        {renderTrending}
        {renderDiscoverForYou}

        <View className="mb-4 flex-row items-center gap-2.5 px-6 pb-4">
          <View className="h-5 w-1 rounded-full bg-white/20" />
          <Text className="text-2xl font-black tracking-tighter text-white">All Songs</Text>
        </View>
      </View>
    ),
    [renderFeatured, renderArtists, renderPlaylists, renderTrending, renderDiscoverForYou]
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <LinearGradient
        colors={['#181818', '#0a0a0a', '#000000']}
        locations={[0, 0.45, 1]}
        className="absolute inset-0"
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <FlatList
        data={allSongs}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <SongRow song={item} index={index} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          songsLoading ? (
            <View className="items-center gap-3 py-12">
              <ActivityIndicator color="#08f808" size="large" />
              <Text className="text-sm font-medium text-zinc-600">Loading songs…</Text>
            </View>
          ) : (
            <View className="items-center gap-2 py-20">
              <Ionicons name="musical-notes-outline" size={40} color="#3f3f46" />
              <Text className="text-base font-semibold text-zinc-500">No songs yet</Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#08f808" size="small" />
            </View>
          ) : null
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#08f808" />
        }
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 2 }}
      />
    </SafeAreaView>
  );
}