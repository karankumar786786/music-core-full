import { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import SongRow from '../../components/SongRow';

export default function Favourites() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ['favourites', 'paginated'],
      queryFn: ({ pageParam = 1 }) => musicApi.getFavourites(pageParam, 50),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (!lastPage?.data || lastPage.data.length < 50) return undefined;
        return (lastPage.meta?.page ?? 0) + 1;
      },
    });

  const favorites = data?.pages?.flatMap((page) => page.data || []) || [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

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
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pb-2 pt-6">
        <View>
          <Text className="text-3xl font-black tracking-tighter text-white">Favourites</Text>
          <Text className="mt-1 text-sm font-medium text-zinc-500">
            {favorites.length} liked songs
          </Text>
        </View>
        {favorites.length > 0 && (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-green-500">
            <Ionicons name="heart" size={20} color="#000" />
          </View>
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
