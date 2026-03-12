import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlayer } from '../lib/player-context';
import { getCoverImageUrl } from '../lib/s3';
import { capitalize } from '../lib/utils';
import { musicApi } from '../lib/api';
import { useAuth } from '../lib/auth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type QualityOption = 'auto' | 'high' | 'med' | 'low';

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const queryClient = useQueryClient();

  const {
    currentSong,
    isPlaying,
    isBuffering,
    duration,
    position,
    bufferedPosition,
    togglePlayPause,
    seekTo,
    activeTrack,
    currentQualityType,
    setQualityType,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    isShuffle,
    repeatMode,
  } = usePlayer();
  const { user } = useAuth();

  // ── Misc ──
  const [isLiked, setIsLiked] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);

  // Check if song is liked
  const { data: favStatus, refetch: refetchFav } = useQuery({
    queryKey: ['favourite-check', currentSong?.id],
    queryFn: () => musicApi.checkFavourite(currentSong!.id),
    enabled: !!currentSong?.id && !!user,
  });

  React.useEffect(() => {
    if (favStatus) {
      setIsLiked(favStatus.isFavourite);
    }
  }, [favStatus]);

  // ─── Queries & Mutations ──────────────────────────────────────────────────

  const { data: playlistsData } = useQuery({
    queryKey: ['userPlaylists'],
    queryFn: () => musicApi.getUserPlaylists(),
    enabled: showPlaylistModal,
  });

  const favMutation = useMutation({
    mutationFn: (wasLiked: boolean) =>
      wasLiked
        ? musicApi.removeFavourite(currentSong?.id || songId!)
        : musicApi.addFavourite(currentSong?.id || songId!),
    onMutate: () => {
      setIsLiked((prev) => !prev);
    },
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
    mutationFn: (playlistId: string) =>
      musicApi.addSongToUserPlaylist(playlistId, currentSong?.id || songId!),
    onSuccess: () => {
      setShowPlaylistModal(false);
      Alert.alert('Added!', 'Song added to playlist');
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
    onError: (error: any) => {
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
  const coverImage =
    currentSong?.coverUrl || getCoverImageUrl(currentSong?.storageKey || null, 'large', true);

  if (!currentSong) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-black"
        edges={['top', 'bottom']}>
        <Ionicons name="musical-notes" size={48} color="#3f3f46" />
        <Text className="mt-4 text-base text-zinc-500">No song selected</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 rounded-full border border-white/10 bg-zinc-900 px-6 py-3">
          <Text className="font-bold text-white">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const playlists = playlistsData?.data || [];

  const qualityOptions: {
    id: QualityOption;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
  }[] = [
    { id: 'auto', label: 'Auto', icon: 'flash-outline', description: 'Adaptive Bitrate' },
    { id: 'high', label: 'High', icon: 'star-outline', description: 'Best Audio Quality' },
    { id: 'med', label: 'Medium', icon: 'bar-chart-outline', description: 'Balanced Quality' },
    { id: 'low', label: 'Low', icon: 'leaf-outline', description: 'Data Saving Mode' },
  ];

  return (
    <View
      className="flex-1 bg-surface"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar style="light" />
      {/* ── Header ── */}
      <View className="flex-row justify-between px-8 pb-8 pt-4">
        <View className="gap-4">
          <Pressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full border border-white/[0.05] bg-surface-card shadow-lg">
            <Ionicons name="chevron-down" size={26} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setShowQualityModal(true)}
            className={`h-12 w-12 items-center justify-center rounded-full border shadow-lg ${
              currentQualityType === 'auto'
                ? 'border-white/[0.05] bg-surface-card'
                : 'border-primary/20 bg-primary/5'
            }`}>
            <Ionicons
              name="options-outline"
              size={24}
              color={currentQualityType === 'auto' ? '#52525b' : '#00FF85'}
            />
          </Pressable>
        </View>

        <View className="flex-1 items-center pt-3">
          <Text className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-600">
            Playing Now
          </Text>
        </View>

        <Pressable
          onPress={() => setShowPlaylistModal(true)}
          className="h-12 w-12 items-center justify-center rounded-full border border-white/[0.05] bg-surface-card shadow-lg">
          <Ionicons name="add" size={28} color="#00FF85" />
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
              <Ionicons name="musical-notes" size={100} color="#00FF85" />
            </View>
          )}
          {isBuffering && (
            <View className="absolute inset-0 items-center justify-center bg-black/50 backdrop-blur-sm">
              <ActivityIndicator color="#00FF85" size="large" />
            </View>
          )}
        </View>
      </View>

      {/* ── Song Info + Controls ── */}
      <View className="px-10 pb-12 pt-10">
        <View className="mb-10 flex-row items-center justify-between">
          <View className="mr-6 flex-1">
            <Text className="text-3xl font-black tracking-tighter text-white" numberOfLines={1}>
              {capitalize(currentSong.title || '')}
            </Text>
            <Text className="mt-2 text-lg font-bold text-zinc-500" numberOfLines={1}>
              {capitalize(currentSong.artistName || '')}
            </Text>
          </View>
          <Pressable
            onPress={() => favMutation.mutate(isLiked)}
            disabled={favMutation.isPending}
            className="h-14 w-14 items-center justify-center rounded-full border border-white/[0.03] bg-surface-card shadow-md">
            {favMutation.isPending ? (
              <ActivityIndicator color="#00FF85" size="small" />
            ) : (
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={28}
                color={isLiked ? '#ef4444' : '#3f3f46'}
              />
            )}
          </Pressable>
        </View>

        {/* Progress Bar */}
        <View className="mb-10">
          <Pressable
            onPress={(e) => {
              const x = e.nativeEvent.locationX;
              const barWidth = SCREEN_WIDTH - 80;
              const ratio = Math.max(0, Math.min(1, x / barWidth));
              seekTo(ratio * duration);
            }}
            className="shadow-inner h-2.5 overflow-hidden rounded-full bg-zinc-900">
            <View
              className="absolute h-full rounded-full bg-white/10"
              style={{ width: `${duration > 0 ? (bufferedPosition / duration) * 100 : 0}%` }}
            />
            <View
              className="h-full rounded-full bg-primary shadow shadow-primary"
              style={{ width: `${progress * 100}%` }}
            />
          </Pressable>
          <View className="mt-4 flex-row justify-between">
            <Text className="text-xs font-black tracking-widest text-zinc-600">
              {formatTime(position)}
            </Text>
            <Text className="text-xs font-black tracking-widest text-zinc-600">
              {formatTime(duration)}
            </Text>
          </View>
        </View>

        {/* Playback Controls */}
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={toggleShuffle}
            className="h-14 w-14 items-center justify-center rounded-full active:bg-white/[0.03]">
            <Ionicons name="shuffle" size={24} color={isShuffle ? '#00FF85' : '#3f3f46'} />
          </Pressable>

          <View className="flex-row items-center gap-10">
            <Pressable
              onPress={playPrevious}
              className="h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-90">
              <Ionicons name="play-skip-back" size={32} color="#fff" />
            </Pressable>
            <Pressable
              onPress={togglePlayPause}
              className="h-24 w-24 items-center justify-center rounded-full bg-white shadow-2xl shadow-white/10 transition-all active:scale-95">
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
              className="h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-90">
              <Ionicons name="play-skip-forward" size={32} color="#fff" />
            </Pressable>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={toggleRepeat}
              className="h-14 w-14 items-center justify-center rounded-full active:bg-white/[0.03]">
              <Ionicons
                name={repeatMode === 'one' ? 'repeat' : 'repeat'}
                size={24}
                color={repeatMode !== 'none' ? '#00FF85' : '#3f3f46'}
              />
              {repeatMode === 'one' && (
                <View className="absolute bottom-2 h-3 w-3 items-center justify-center rounded-full bg-primary">
                  <Text className="text-[7px] font-black text-black">1</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => router.push('/lyrics')}
              className="h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-all active:scale-90">
              <Ionicons name="text" size={24} color="#00FF85" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Quality Modal */}
      <Modal visible={showQualityModal} animationType="fade" transparent>
        <Pressable
          onPress={() => setShowQualityModal(false)}
          className="flex-1 items-center justify-center bg-black/90 px-8">
          <View className="w-full rounded-[40px] border border-white/[0.03] bg-surface-card p-10 shadow-2xl">
            <View className="mb-10 flex-row items-center justify-between">
              <Text className="text-2xl font-black tracking-tighter text-white">Audio Quality</Text>
              <Pressable
                onPress={() => setShowQualityModal(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/[0.05]">
                <Ionicons name="close" size={24} color="#52525b" />
              </Pressable>
            </View>

            <View className="mb-10 gap-3">
              {qualityOptions.map((opt) => {
                const isActive = currentQualityType === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      setQualityType(opt.id);
                      setShowQualityModal(false);
                    }}
                    className={`flex-row items-center justify-between rounded-2xl border px-6 py-5 ${
                      isActive
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-white/[0.02] bg-surface-muted'
                    }`}>
                    <View className="flex-row items-center gap-5">
                      <Ionicons
                        name={opt.icon}
                        size={22}
                        color={isActive ? '#00FF85' : '#3f3f46'}
                      />
                      <View>
                        <Text
                          className={`text-lg font-black tracking-tight ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                          {opt.label}
                        </Text>
                        <Text className="text-xs font-bold text-zinc-700">{opt.description}</Text>
                      </View>
                    </View>
                    {isActive && <Ionicons name="checkmark-circle" size={26} color="#00FF85" />}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setShowQualityModal(false)}
              className="h-16 items-center justify-center rounded-[20px] bg-primary shadow-lg shadow-primary/20 active:opacity-90">
              <Text className="text-lg font-black text-black">Apply Changes</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Playlist Modal */}
      <Modal visible={showPlaylistModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/80">
          <View className="rounded-t-[48px] border-t border-white/[0.03] bg-surface-card px-8 pb-14 pt-10 shadow-2xl">
            <View className="mb-8 items-center">
              <View className="mb-6 h-1.5 w-12 rounded-full bg-zinc-800" />
              <Text className="text-3xl font-black tracking-tighter text-white">
                Add to Playlist
              </Text>
              <Text className="mt-2 text-center text-[15px] font-bold text-zinc-500">
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
                    disabled={addToPlaylistMutation.isPending}
                    className="mb-2 flex-row items-center gap-4 rounded-3xl px-3 py-4 active:bg-white/[0.03]">
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted shadow-sm shadow-black">
                      <Ionicons name="musical-notes" size={28} color="#00FF85" />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-[17px] font-black tracking-tight text-white"
                        numberOfLines={1}>
                        {capitalize(item.title)}
                      </Text>
                      <Text className="mt-1 text-xs font-black uppercase tracking-widest text-zinc-600">
                        {item.songs?.length || 0} tracks
                      </Text>
                    </View>
                    {addToPlaylistMutation.isPending ? (
                      <ActivityIndicator color="#00FF85" size="small" />
                    ) : (
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/5">
                        <Ionicons name="add" size={24} color="#00FF85" />
                      </View>
                    )}
                  </Pressable>
                )}
              />
            )}

            <Pressable
              onPress={() => setShowPlaylistModal(false)}
              className="mt-6 h-16 items-center justify-center rounded-[20px] bg-white transition-all active:scale-[0.98]">
              <Text className="text-lg font-black text-black">Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
