import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../lib/api';
import { getCoverImageUrl } from '../lib/s3';
import { capitalize } from '../lib/utils';
import { usePlayer } from '../lib/player-context';

export default function HistoryScreen() {
  const { play } = usePlayer();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ['history'],
      queryFn: ({ pageParam = 1 }) => musicApi.getHistory(pageParam, 50),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (!lastPage?.data || lastPage.data.length < 50) return undefined;
        return (lastPage.meta?.page ?? 0) + 1;
      },
    });

  const history = data?.pages?.flatMap((page) => page.data || []) || [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top']}>
        <View className="flex-row items-center gap-3 px-5 pb-4 pt-2">
          <View className="h-10 w-10 rounded-full bg-zinc-900" />
          <View className="h-5 w-24 rounded bg-zinc-900" />
        </View>
        <View className="mt-2 gap-3 px-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} className="flex-row items-center gap-3 px-4 py-3">
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

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const song = item.song || item;
    if (!song?.id) return null;
    const coverUrl = getCoverImageUrl(song.storageKey, 'small', true) || null;

    return (
      <Pressable
        onPress={() => {
          play({
            id: song.id,
            title: song.title,
            artistName: song.artistName,
            storageKey: song.storageKey,
            coverUrl,
          });
        }}
        className="flex-row items-center gap-3 rounded-2xl">
        <View className="h-14 w-14 overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="musical-notes" size={20} color="#3f3f46" />
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-white" numberOfLines={1}>
            {capitalize(song.title)}
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-zinc-500" numberOfLines={1}>
            {capitalize(song.artistName)}
          </Text>
        </View>
        {item.viewedAt && (
          <Text className="text-[10px] font-semibold text-zinc-700">
            {new Date(item.viewedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80">
          <Ionicons name="arrow-back" size={20} color="#a1a1aa" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-black tracking-tight text-white">History</Text>
          <Text className="text-xs font-semibold text-zinc-500">
            {history.length} songs listened
          </Text>
        </View>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item, i) => item?.id || `h-${i}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <View className="mb-5 h-24 w-24 items-center justify-center rounded-full border border-white/5 bg-zinc-900/60">
              <Ionicons name="time-outline" size={40} color="#3f3f46" />
            </View>
            <Text className="text-lg font-bold text-zinc-400">No history yet</Text>
            <Text className="mt-2 px-12 text-center text-sm text-zinc-600">
              Songs you listen to will appear here
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
