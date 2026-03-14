import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl, getBannerImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import { usePlayer } from '../../lib/player-context';
import SongRow from '../../components/SongRow';
import { useMemo, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ArtistDetail() {
  const insets = useSafeAreaInsets();
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const { playAll } = usePlayer();

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

  const avatarUrl = artist ? getCoverImageUrl(artist.storageKey, 'large') || null : null;
  const bannerUrl = artist ? getBannerImageUrl(artist.storageKey, 'large') || null : null;

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
    if (!artist) return null;
    return (
      <View>
        {/* Hero Section */}
        <View className="h-[460px] w-full bg-zinc-900">
          {bannerUrl ? (
            <Image 
              source={{ uri: bannerUrl }} 
              className="h-full w-full" 
              resizeMode="cover" 
            />
          ) : avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl }} 
              className="h-full w-full" 
              resizeMode="cover" 
              blurRadius={10}
            />
          ) : (
            <View className="h-full w-full bg-zinc-900" />
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', 'black']}
            className="absolute inset-0"
          />

          {/* Artist Identity Overlay */}
          <View className="absolute bottom-0 left-0 right-0 px-6 pb-8">
            <View className="flex-row items-end gap-5">
              {/* Avatar restoration */}
              <View className="h-32 w-32 overflow-hidden rounded-3xl border-2 border-primary/30 bg-zinc-800 shadow-2xl">
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <View className="h-full w-full items-center justify-center bg-primary/10">
                    <Text className="text-4xl font-black text-primary">
                      {artist.artistName?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-1 pb-1">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="checkmark-circle" size={14} color="#00FF85" />
                  <Text className="text-[10px] font-black uppercase tracking-[2px] text-primary/90">
                    Verified Artist
                  </Text>
                </View>
                <Text 
                  className="mt-1 text-4xl font-black tracking-tighter text-white uppercase"
                  numberOfLines={2}
                  style={{ lineHeight: 40 }}
                >
                  {capitalize(artist.artistName)}
                </Text>
              </View>
            </View>

            <View className="mt-6 flex-row items-center gap-3">
              <View className="rounded-full bg-white/10 px-3 py-1.5">
                <Text className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                  {totalTracks} Tracks
                </Text>
              </View>
              {artist.bio && (
                 <Text className="flex-1 text-xs font-bold text-zinc-400" numberOfLines={2}>
                   {artist.bio}
                 </Text>
              )}
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
             <Text className="font-black tracking-widest text-white uppercase text-xs">Follow</Text>
          </Pressable>

          <Pressable className="h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] active:bg-white/10">
            <Ionicons name="share-outline" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Tracks List Header */}
        <View className="px-6 pb-2">
          <Text className="text-xl font-black tracking-tight text-white">Popular Releases</Text>
        </View>
      </View>
    );
  }, [artist, songs, bannerUrl, avatarUrl, handlePlayAll, totalTracks]);

  if (isArtistLoading || isSongsLoading) {
    return (
      <View className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="h-[420px] w-full bg-zinc-900/50" />
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
      
      {/* Background Blur */}
      {avatarUrl || bannerUrl ? (
        <Image
          source={{ uri: bannerUrl || avatarUrl! }}
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
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <SongRow song={item} index={index} />}
        ListHeaderComponent={MemoizedHeader}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#00FF85" />
            </View>
          ) : <View className="h-20" />
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
