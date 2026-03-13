import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import SongRow from '../../components/SongRow';
import { usePlayer } from '../../lib/player-context';
import { getCoverImageUrl } from '../../lib/s3';
import { useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function Favourites() {
  const { playAll } = usePlayer();
  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ['favourites', 'paginated'],
      queryFn: ({ pageParam = 1 }) => musicApi.getFavourites(pageParam, 20),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (!lastPage?.data || lastPage.data.length < 20) return undefined;
        return (lastPage.meta?.page ?? 0) + 1;
      },
    });

  const favorites = data?.pages?.flatMap((page) => page.data || []) || [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePlayAll = () => {
    if (favorites.length === 0) return;
    const playerSongs = favorites
      .map((item: any) => {
        const s = item.song;
        if (!s) return null;
        return {
          id: s.id,
          title: s.title,
          artistName: s.artistName,
          storageKey: s.storageKey,
          coverUrl: getCoverImageUrl(s.storageKey, 'large', true) || null,
        };
      })
      .filter(Boolean);

    if (playerSongs.length === 0) return;
    playAll(playerSongs as any);
    router.push({ pathname: '/player', params: { songId: playerSongs[0]!.id } });
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const song = item.song;
    if (!song) return null;
    return <SongRow song={{ ...song, isLiked: true }} index={index} />;
  };

  // Full-screen loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top']}>
        <View className="px-6 pb-4 pt-6">
          <Text className="text-3xl font-black tracking-tighter text-white">Favourites</Text>
          <Text className="mt-1 text-sm font-medium text-zinc-500">
            Your collection of liked songs
          </Text>
        </View>
        {/* Skeleton loading */}
        <View className="mt-2 gap-3 px-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <LinearGradient
        colors={['#1a1a1a', '#050505']}
        className="absolute inset-0"
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
      {/* Header */}
      <View className="px-6 pb-4 pt-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-4xl font-black tracking-tighter text-white">Favourites</Text>
            <Text className="mt-1 text-sm font-bold text-zinc-500">
              {favorites.length} liked songs
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            {isFetching && !isFetchingNextPage && !isLoading && (
              <ActivityIndicator color="#08f808" size="small" />
            )}
            {favorites.length > 0 && (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <Ionicons name="heart" size={20} color="#08f808" />
              </View>
            )}
          </View>
        </View>

        {/* Play All Button */}
        {favorites.length > 0 && (
          <Pressable
            onPress={handlePlayAll}
            className="mt-6 h-14 flex-row items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/20 active:opacity-90">
            <Ionicons name="play" size={22} color="#000" style={{ marginLeft: 2 }} />
            <Text className="ml-2 text-lg font-black text-black">Play All</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <View className="mb-5 h-24 w-24 items-center justify-center rounded-full border border-white/5 bg-zinc-900/60">
              <Ionicons name="heart-outline" size={40} color="#3f3f46" />
            </View>
            <Text className="text-lg font-bold text-zinc-400">No favourites yet</Text>
            <Text className="mt-2 px-12 text-center text-sm text-zinc-600">
              Tap the heart icon on any song to add it to your favourites
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
      />
    </SafeAreaView>
  );
}
