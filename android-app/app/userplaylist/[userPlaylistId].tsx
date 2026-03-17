import { View, Text, FlatList, Image, Pressable, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import { usePlayerActions } from '../../lib/player-context';
import SongRow from '../../components/SongRow';
import { useMemo, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function UserPlaylistDetail() {
  const insets = useSafeAreaInsets();
  const { userPlaylistId } = useLocalSearchParams<{ userPlaylistId: string }>();
  const { playAll } = usePlayerActions();
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

  const coverUrl = playlist ? getCoverImageUrl(playlist.storageKey, 'large') || null : null;

  const removeMutation = useMutation({
    mutationFn: (songId: string) => musicApi.removeSongFromUserPlaylist(userPlaylistId!, songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylist', userPlaylistId] });
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
    onError: () => Alert.alert('Error', 'Failed to remove song'),
  });

  const handleRemove = (song: any) => {
    Alert.alert('Remove Song', `Remove "${song.title}" from this playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(song.id) },
    ]);
  };

  const handlePlayAll = useCallback(() => {
    if (songs.length === 0) return;
    const playerSongs = songs.map((s: any) => ({
      id: s.id,
      title: s.title,
      artistName: s.artistName,
      storageKey: s.storageKey,
      coverUrl: getCoverImageUrl(s.storageKey, 'large', true) || null,
    }));
    playAll(playerSongs);
  }, [songs, playAll]);

  const MemoizedHeader = useMemo(() => {
    if (!playlist) return null;

    return (
      <View>
        {/* ── Hero ── */}
        <View style={{ height: 500, width: SCREEN_WIDTH }}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{ position: 'absolute', width: '100%', height: '100%' }}
              className="items-center justify-center bg-zinc-900">
              <Ionicons name="musical-notes" size={80} color="rgba(255,255,255,0.04)" />
            </View>
          )}

          {/* Multi-layer gradient */}
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.15)',
              'rgba(0,0,0,0)',
              'rgba(0,0,0,0.3)',
              'rgba(0,0,0,0.75)',
              'rgba(0,0,0,0.97)',
            ]}
            locations={[0, 0.2, 0.5, 0.78, 1]}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          />

          {/* Side vignette */}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.4)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          />

          {/* Bottom content */}
          <View className="absolute bottom-0 left-0 right-0 px-6 pb-7">
            {/* Cover + title */}
            <View className="mb-5 flex-row items-end gap-4">
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 24,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: 'rgba(8,248,8,0.25)',
                  shadowColor: '#08f808',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 20,
                  elevation: 10,
                }}>
                {coverUrl ? (
                  <Image
                    source={{ uri: coverUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center bg-zinc-800">
                    <Ionicons name="musical-notes" size={36} color="#08f808" />
                  </View>
                )}
              </View>

              <View className="flex-1 pb-1">
                <View className="mb-1.5 flex-row items-center gap-1.5">
                  <View className="h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Ionicons name="person" size={9} color="#000" />
                  </View>
                  <Text className="text-[10px] font-black uppercase tracking-[3px] text-primary/80">
                    Personal Playlist
                  </Text>
                </View>
                <Text
                  className="font-black text-white uppercase"
                  numberOfLines={2}
                  style={{ fontSize: 38, lineHeight: 42, letterSpacing: -1.5 }}>
                  {capitalize(playlist.title)}
                </Text>
              </View>
            </View>

            {/* Stats row */}
            <View className="flex-row items-center gap-2">
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}>
                <Text className="text-[11px] font-black uppercase tracking-[2px] text-zinc-300">
                  {songs.length} Tracks
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Action Bar ── */}
        <View className="px-6 py-5">
          <Pressable
            onPress={handlePlayAll}
            style={{
              shadowColor: '#08f808',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 8,
            }}
            className="h-14 flex-row items-center justify-center gap-3 rounded-2xl bg-primary active:opacity-80">
            <Ionicons name="play" size={22} color="#000" style={{ marginLeft: 3 }} />
            <Text
              style={{ letterSpacing: 2 }}
              className="text-[13px] font-black uppercase text-black">
              Play All
            </Text>
          </Pressable>
        </View>

        {/* ── Section Header ── */}
        <View className="flex-row items-center justify-between px-6 pb-3 pt-1">
          <Text className="text-[22px] font-black tracking-tight text-white">Tracks</Text>
          <Text className="text-[11px] font-black uppercase tracking-[2px] text-zinc-600">
            {songs.length} songs
          </Text>
        </View>
      </View>
    );
  }, [playlist, songs.length, coverUrl, handlePlayAll]);

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 bg-black">
        <StatusBar style="light" />
        <View style={{ height: 500 }} className="w-full bg-zinc-900/60">
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)', 'black']}
            locations={[0.5, 0.85, 1]}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          />
          <View className="absolute bottom-7 left-6 right-6">
            <View className="mb-5 flex-row items-end gap-4">
              <View className="h-24 w-24 rounded-3xl bg-zinc-800" />
              <View className="flex-1 gap-2 pb-1">
                <View className="h-3 w-24 rounded-full bg-zinc-800" />
                <View className="h-9 w-48 rounded-xl bg-zinc-800" />
              </View>
            </View>
            <View className="h-7 w-28 rounded-full bg-zinc-800" />
          </View>
        </View>
        {/* Play All skeleton */}
        <View className="px-6 py-5">
          <View className="h-14 w-full rounded-2xl bg-zinc-900" />
        </View>
        {/* Track skeletons */}
        <View className="px-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} className="flex-row items-center gap-4 py-3">
              <View className="h-5 w-5 rounded bg-zinc-900" />
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
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Full screen small blurred ambient background */}
      {coverUrl && (
        <>
          <Image
            source={{ uri: coverUrl }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              opacity: 0.08,
            }}
            blurRadius={50}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'black']}
            locations={[0, 0.4, 0.8]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </>
      )}

      {/* Floating back button */}
      <Pressable
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: insets.top + 12,
          left: 20,
          zIndex: 50,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>

      <FlatList
        data={songs}
        keyExtractor={(item, index) => item?.id || `song-${index}`}
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            index={index}
            renderRightAction={() => (
              <Pressable
                onPress={() => handleRemove(item)}
                disabled={removeMutation.isPending}
                style={{
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 20,
                }}>
                {removeMutation.isPending && removeMutation.variables === item.id ? (
                  <ActivityIndicator color="#ef4444" size="small" />
                ) : (
                  <Ionicons name="trash-outline" size={19} color="#52525b" />
                )}
              </Pressable>
            )}
          />
        )}
        ListHeaderComponent={MemoizedHeader}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#08f808" size="small" />
            </View>
          ) : (
            <View className="h-24" />
          )
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}