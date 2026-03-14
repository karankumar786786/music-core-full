import { View, Text, FlatList, Image, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import { usePlayer } from '../../lib/player-context';
import SongRow from '../../components/SongRow';
import { useMemo, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function UserPlaylistDetail() {
  const insets = useSafeAreaInsets();
  const { userPlaylistId } = useLocalSearchParams<{ userPlaylistId: string }>();
  const { playAll } = usePlayer();
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
        {/* Hero Section */}
        <View className="h-[400px] w-full bg-zinc-900">
          {coverUrl ? (
            <Image 
              source={{ uri: coverUrl }} 
              className="h-full w-full" 
              resizeMode="cover" 
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-zinc-900">
              <Ionicons name="musical-notes" size={80} color="rgba(255,255,255,0.05)" />
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)', 'black']}
            className="absolute inset-0"
          />

          {/* Info Overlay */}
          <View className="absolute bottom-0 left-0 right-0 px-6 pb-8">
            <View className="flex-row items-end gap-5">
              {/* Cover restoration */}
              <View className="h-28 w-28 overflow-hidden rounded-3xl border-2 border-primary/30 bg-zinc-800 shadow-2xl">
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <View className="h-full w-full items-center justify-center bg-primary/10">
                    <Ionicons name="musical-notes" size={40} color="#22c55e" />
                  </View>
                )}
              </View>

              <View className="flex-1 pb-1">
                <Text className="text-[10px] font-black uppercase tracking-[2px] text-primary/90">
                  Personal Playlist
                </Text>
                <Text 
                  className="mt-1 text-3xl font-black tracking-tighter text-white uppercase"
                  numberOfLines={2}
                  style={{ lineHeight: 32 }}
                >
                  {capitalize(playlist.title)}
                </Text>
              </View>
            </View>
            
            <View className="mt-6 flex-row items-center gap-3">
               <View className="rounded-full bg-white/10 px-3 py-1.5">
                 <Text className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                   {songs.length} Tracks
                 </Text>
               </View>
            </View>
          </View>
        </View>

        {/* Action Controls */}
        <View className="flex-row items-center gap-4 px-6 py-6">
          <Pressable
            onPress={handlePlayAll}
            className="h-16 w-16 items-center justify-center rounded-full bg-primary shadow-2xl shadow-primary/40 active:scale-95"
          >
            <Ionicons name="play" size={32} color="#000" style={{ marginLeft: 4 }} />
          </Pressable>
          
          <Pressable className="h-14 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] active:bg-white/10">
             <Text className="font-black tracking-widest text-white uppercase text-xs">Add Songs</Text>
          </Pressable>

          <Pressable className="h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] active:bg-white/10">
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* Tracks Header */}
        <View className="px-6 pb-2">
           <Text className="text-xl font-black tracking-tight text-white">Tracks</Text>
        </View>
      </View>
    );
  }, [playlist, songs.length, coverUrl, handlePlayAll]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="h-[360px] w-full bg-zinc-900/50" />
        <View className="mt-8 gap-4 px-6">
          <View className="h-8 w-48 rounded-lg bg-zinc-900" />
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="flex-row items-center gap-4 py-2">
              <View className="h-14 w-14 rounded-xl bg-zinc-900" />
              <View className="flex-1 gap-2">
                <View className="h-4 w-3/4 rounded bg-zinc-900" />
                <View className="h-3 w-1/2 rounded bg-zinc-900" />
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
      
      {/* Background Ambience */}
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.2,
          }}
          blurRadius={100}
        />
      ) : null}

      {/* Floating Back Button */}
      <View 
        className="absolute left-6 z-50 h-10 w-10 overflow-hidden rounded-full"
        style={{ top: insets.top + 10 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="h-full w-full items-center justify-center bg-black/40"
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
      </View>

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
                className="h-10 w-10 items-center justify-center rounded-full active:bg-red-500/10"
              >
                {removeMutation.isPending && removeMutation.variables === item.id ? (
                  <ActivityIndicator color="#ef4444" size="small" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#71717a" />
                )}
              </Pressable>
            )}
          />
        )}
        ListHeaderComponent={MemoizedHeader}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#00FF85" />
            </View>
          ) : <View className="h-24" />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
