import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import SongRow from '../../components/SongRow';
import { usePlayerActions } from '../../lib/player-context';
import { getCoverImageUrl } from '../../lib/s3';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';

export default function Favourites() {
  const { playAll } = usePlayerActions();
  const queryClient = useQueryClient();

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

  const removeFavMutation = useMutation({
    mutationFn: (songId: string) => musicApi.removeFavourite(songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to remove from favourites');
    },
  });

  const favorites = data?.pages?.flatMap((page) => page.data || []) || [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePlayAll = useCallback(() => {
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
  }, [favorites, playAll]);

  const MemoizedHeader = useMemo(
    () => (
      <View className="px-6 pb-4 pt-6">
        {/* Title row */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
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
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(8,248,8,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(8,248,8,0.15)',
                }}>
                <Ionicons name="heart" size={20} color="#08f808" />
              </View>
            )}
          </View>
        </View>

        {/* Play All */}
        {favorites.length > 0 && (
          <Pressable
            onPress={handlePlayAll}
            style={{
              marginTop: 20,
              shadowColor: '#08f808',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 8,
            }}
            className="h-14 flex-row items-center justify-center gap-3 rounded-2xl bg-primary active:opacity-80">
            <Ionicons name="play" size={22} color="#000" style={{ marginLeft: 3 }} />
            <Text style={{ letterSpacing: 2 }} className="text-[13px] font-black uppercase text-black">
              Play All
            </Text>
          </Pressable>
        )}
      </View>
    ),
    [favorites, isFetching, isFetchingNextPage, isLoading, handlePlayAll]
  );

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const song = item.song;
    if (!song) return null;
    return (
      <SongRow
        song={{ ...song, isLiked: true }}
        index={index}
        renderRightAction={() => (
          <Pressable
            onPress={() => {
              Alert.alert('Remove Favourite', 'Are you sure you want to remove this song?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => removeFavMutation.mutate(song.id),
                },
              ]);
            }}
            disabled={removeFavMutation.isPending}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
            }}>
            {removeFavMutation.isPending && removeFavMutation.variables === song.id ? (
              <ActivityIndicator color="#ef4444" size="small" />
            ) : (
              <Ionicons name="trash-outline" size={19} color="#ef4444" />
            )}
          </Pressable>
        )}
      />
    );
  };

  // ── Skeleton ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top']}>
        <LinearGradient
          colors={['#1a1a1a', '#050505']}
          className="absolute inset-0"
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.5 }}
        />
        <View className="px-6 pb-4 pt-6">
          <View className="h-10 w-48 rounded-xl bg-zinc-900" />
          <View className="mt-2 h-4 w-32 rounded-lg bg-zinc-900" />
          <View className="mt-5 h-14 w-full rounded-2xl bg-zinc-900" />
        </View>
        <View className="mt-2 px-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} className="flex-row items-center gap-3 px-4 py-3">
              <View className="h-4 w-5 rounded bg-zinc-900" />
              <View className="h-14 w-14 rounded-xl bg-zinc-900" />
              <View className="flex-1 gap-2">
                <View
                  className="h-4 rounded-lg bg-zinc-900"
                  style={{ width: `${60 + (i % 3) * 15}%` }}
                />
                <View className="h-3 w-1/3 rounded-lg bg-zinc-900" />
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

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={MemoizedHeader}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center py-24">
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
                marginBottom: 20,
              }}>
              <Ionicons name="heart-outline" size={40} color="#3f3f46" />
            </View>
            <Text className="text-lg font-black tracking-tight text-zinc-400">
              No favourites yet
            </Text>
            <Text className="mt-2 px-12 text-center text-sm font-medium text-zinc-600">
              Tap the heart icon on any song to add it here
            </Text>
          </View>
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#08f808"
          />
        }
      />
    </SafeAreaView>
  );
}