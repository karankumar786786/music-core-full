import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
  Alert,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlayer, usePlayerProgress } from '../lib/player-context';
import { getCoverImageUrl } from '../lib/s3';
import { capitalize } from '../lib/utils';
import { musicApi } from '../lib/api';
import { useAuth } from '../lib/auth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const queryClient = useQueryClient();

  const {
    currentSong,
    isPlaying,
    isBuffering,
    togglePlayPause,
    seekTo,
    playNext,
    playPrevious,
    toggleRepeat,
    repeatMode,
  } = usePlayer();
  const { position, duration, bufferedPosition } = usePlayerProgress();
  const { user } = useAuth();

  const [isLiked, setIsLiked] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [pendingPlaylistId, setPendingPlaylistId] = useState<string | null>(null);

  const progressBarWidthRef = useRef(SCREEN_WIDTH - 80);

  const effectiveSongId = currentSong?.id ?? songId ?? '';

  const coverImage =
    currentSong?.coverUrl || getCoverImageUrl(currentSong?.storageKey || null, 'large', true);

  const { data: favStatus, refetch: refetchFav } = useQuery({
    queryKey: ['favourite-check', effectiveSongId],
    queryFn: () => musicApi.checkFavourite(effectiveSongId),
    enabled: !!effectiveSongId && !!user,
  });

  useEffect(() => {
    if (favStatus) setIsLiked(favStatus.isFavourite);
  }, [favStatus]);

  const { data: playlistsData } = useQuery({
    queryKey: ['userPlaylists'],
    queryFn: () => musicApi.getUserPlaylists(),
    enabled: showPlaylistModal,
  });

  const favMutation = useMutation({
    mutationFn: (wasLiked: boolean) =>
      wasLiked ? musicApi.removeFavourite(effectiveSongId) : musicApi.addFavourite(effectiveSongId),
    onMutate: () => setIsLiked((prev) => !prev),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites'] });
      refetchFav();
    },
    onError: (error: any) => {
      setIsLiked((prev) => !prev);
      if (error.response?.status === 409) {
        Alert.alert('Already exists', 'Song already in favourites');
        queryClient.invalidateQueries({ queryKey: ['favourites'] });
        refetchFav();
      } else {
        Alert.alert('Error', 'Failed to update favourites');
      }
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: (playlistId: string) => {
      setPendingPlaylistId(playlistId);
      return musicApi.addSongToUserPlaylist(playlistId, effectiveSongId);
    },
    onSuccess: () => {
      setPendingPlaylistId(null);
      setShowPlaylistModal(false);
      Alert.alert('Added!', 'Song added to playlist');
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
    onError: (error: any) => {
      setPendingPlaylistId(null);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to add song');
    },
  });

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;
  const ART_SIZE = SCREEN_WIDTH - 48;

  if (!currentSong) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-black"
        edges={['top', 'bottom']}>
        <Ionicons name="musical-notes" size={48} color="#3f3f46" />
        <Text className="mt-4 text-base text-white">No song selected</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 rounded-full border border-white/10 bg-zinc-900 px-6 py-3">
          <Text className="font-bold text-white">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const playlists = playlistsData?.data || [];

  return (
    <View className="flex-1 bg-black">
      {coverImage ? (
        <Image
          source={{ uri: coverImage }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          blurRadius={80}
          resizeMode="cover"
        />
      ) : null}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
      />
      <StatusBar style="light" />
      <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* ── Header ── */}
        <View className="flex-row items-start justify-between px-8 pb-8 pt-4">
          <Pressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] shadow-lg">
            <Ionicons name="chevron-down" size={26} color="#fff" />
          </Pressable>

          <Text className="pt-3 text-[11px] font-black uppercase tracking-[0.3em] text-white">
            Playing Now
          </Text>

          <Pressable
            onPress={() => setShowPlaylistModal(true)}
            className="h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] shadow-lg">
            <Ionicons name="add" size={28} color="#08f808" />
          </Pressable>
        </View>

        {/* ── Album Art ── */}
        <View className="flex-1 items-center justify-center px-10">
          <View
            style={{ width: ART_SIZE, height: ART_SIZE, borderRadius: 32 }}
            className="overflow-hidden border border-white/[0.03] bg-surface-card shadow-2xl shadow-primary/5">
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-primary/5">
                <Ionicons name="musical-notes" size={100} color="#08f808" />
              </View>
            )}
          </View>
        </View>

        {/* ── Song Info + Controls ── */}
        <View className="px-10 pb-12 pt-10">
          {/* Song Info + Like */}
          <View className="mb-10 flex-row items-center justify-between">
            <View className="mr-6 flex-1">
              <Text className="text-3xl font-black tracking-tighter text-white" numberOfLines={1}>
                {capitalize(currentSong.title || '')}
              </Text>
              <Text className="mt-2 text-lg font-bold text-zinc-400" numberOfLines={1}>
                {capitalize(currentSong.artistName || '')}
              </Text>
            </View>
            <Pressable
              onPress={() => favMutation.mutate(isLiked)}
              disabled={favMutation.isPending}
              className="h-14 w-14 items-center justify-center rounded-full">
              {favMutation.isPending ? (
                <ActivityIndicator color="#08f808" size="small" />
              ) : (
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={28}
                  color={isLiked ? '#ef4444' : '#fff'}
                />
              )}
            </Pressable>
          </View>

          {/* Progress Bar */}
          <View className="mb-10">
            <Pressable
              onLayout={(e: LayoutChangeEvent) => {
                progressBarWidthRef.current = e.nativeEvent.layout.width;
              }}
              onPress={(e) => {
                const x = e.nativeEvent.locationX;
                const ratio = Math.max(0, Math.min(1, x / progressBarWidthRef.current));
                seekTo(ratio * duration);
              }}
              className="shadow-inner h-2.5 rounded-full bg-zinc-900">
              <View
                className="absolute h-full rounded-md bg-white"
                style={{ width: `${duration > 0 ? (bufferedPosition / duration) * 100 : 0}%` }}
              />
              <View
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress * 100}%` }}
              />
              <View
                className="absolute -top-[6px] h-6 w-6 items-center justify-center"
                style={{ left: `${progress * 100}%`, marginLeft: -12 }}>
                <View className="h-4 w-4 rounded-full bg-white" />
              </View>
            </Pressable>
            <View className="mt-4 flex-row justify-between">
              <Text className="text-xs font-black tracking-widest text-white">
                {formatTime(position)}
              </Text>
              <Text className="text-xs font-black tracking-widest text-white">
                {formatTime(duration)}
              </Text>
            </View>
          </View>

          {/* Playback Controls */}
          <View className="relative flex-row items-center justify-center px-16">
            {/* Lyrics — absolutely left */}
            <Pressable
              onPress={() => router.push('/lyrics')}
              className="absolute left-0 h-12 w-12 items-center justify-center rounded-full ">
              <Ionicons name="text" size={24} color="#fff" />
            </Pressable>

            {/* Center controls — always truly centered */}
            <View className="flex-row items-center gap-6 ml-2">
              <Pressable
                onPress={playPrevious}
                className="h-14 w-14 items-center justify-center rounded-full active:scale-90">
                <Ionicons name="play-skip-back" size={32} color="#fff" />
              </Pressable>
              <Pressable
                onPress={togglePlayPause}
                className="h-24 w-24 items-center justify-center rounded-full bg-white shadow-2xl shadow-white/10  active:scale-95">
                {isBuffering ? (
                  <ActivityIndicator color="#000" size="large" />
                ) : (
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={42}
                    color="#000"
                    style={!isPlaying ? { marginLeft: 5 } : undefined}
                  />
                )}
              </Pressable>
              <Pressable
                onPress={playNext}
                className="h-14 w-14 items-center justify-center rounded-full active:scale-90 ">
                <Ionicons name="play-skip-forward" size={32} color="#fff" />
              </Pressable>
            </View>

            {/* Repeat — absolutely right */}
            <Pressable
              onPress={toggleRepeat}
              className="absolute right-0 h-14 w-14 items-center justify-center rounded-full active:bg-white/[0.03]">
              <Ionicons
                name="repeat"
                size={24}
                color={repeatMode !== 'none' ? '#08f808' : '#fff'}
              />
              {repeatMode === 'one' && (
                <View className="absolute bottom-2 h-3 w-3 items-center justify-center rounded-full bg-primary">
                  <Text className="text-[7px] font-black text-black">1</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Playlist Modal ── */}
        <Modal visible={showPlaylistModal} animationType="slide" transparent>
          <View className="flex-1 justify-end">
            <Pressable
              onPress={() => setShowPlaylistModal(false)}
              className="absolute inset-0 bg-black/60"
            />
            <View className="overflow-hidden rounded-t-[48px] border-t border-white/[0.1] bg-black/95 px-8 pb-14 pt-10 shadow-2xl">
              <View className="mb-8 items-center">
                <View className="mb-6 h-1.5 w-12 rounded-full bg-white/10" />
                <Text className="text-3xl font-black tracking-tighter text-white">
                  Add to Playlist
                </Text>
                <Text className="mt-2 text-center text-[15px] font-bold text-zinc-400">
                  Organize your premium collection
                </Text>
              </View>

              {playlists.length === 0 ? (
                <View className="mb-6 items-center rounded-3xl bg-surface-muted/50 py-10">
                  <Ionicons name="folder-open-outline" size={48} color="#27272a" />
                  <Text className="mt-4 text-lg font-bold text-zinc-600">No playlists found</Text>
                  <Text className="mt-1 text-sm font-bold text-zinc-700">
                    Create one in your library
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={playlists}
                  keyExtractor={(item: any) => item.id}
                  style={{ maxHeight: 350 }}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }: { item: any }) => (
                    <Pressable
                      onPress={() => addToPlaylistMutation.mutate(item.id)}
                      disabled={pendingPlaylistId === item.id}
                      className="mb-2 flex-row items-center gap-4 rounded-3xl px-3 py-4 active:bg-white/[0.03]">
                      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted shadow-sm shadow-black">
                        <Ionicons name="musical-notes" size={28} color="#08f808" />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-[17px] font-black tracking-tight text-white"
                          numberOfLines={1}>
                          {capitalize(item.title)}
                        </Text>
                      </View>
                      {pendingPlaylistId === item.id ? (
                        <ActivityIndicator color="#08f808" size="small" />
                      ) : (
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/5">
                          <Ionicons name="add" size={24} color="#08f808" />
                        </View>
                      )}
                    </Pressable>
                  )}
                />
              )}

              <Pressable
                onPress={() => setShowPlaylistModal(false)}
                className="mt-6 h-16 items-center justify-center rounded-[20px] bg-white active:scale-[0.98]">
                <Text className="text-lg font-black text-black">Dismiss</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}
