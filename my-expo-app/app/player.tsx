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
  } = usePlayer();

  // ── Misc ──
  const [isLiked, setIsLiked] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);

  // ─── Queries & Mutations ──────────────────────────────────────────────────

  const { data: playlistsData } = useQuery({
    queryKey: ['userPlaylists'],
    queryFn: () => musicApi.getUserPlaylists(),
    enabled: showPlaylistModal,
  });

  const favMutation = useMutation({
    mutationFn: () =>
      isLiked
        ? musicApi.removeFavourite(currentSong?.id || songId!)
        : musicApi.addFavourite(currentSong?.id || songId!),
    onMutate: () => {
      setIsLiked(!isLiked);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites'] });
    },
    onError: () => {
      setIsLiked(!isLiked);
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
      className="flex-1 bg-black"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar style="light" />
      {/* ── Header ── */}
      <View className="flex-row justify-between px-6 pb-6 pt-2">
        <View className="gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80">
            <Ionicons name="chevron-down" size={24} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setShowQualityModal(true)}
            className={`h-11 w-11 items-center justify-center rounded-full border bg-zinc-900/80 ${
              currentQualityType === 'auto' ? 'border-white/10' : 'border-green-500/30'
            }`}>
            <Ionicons
              name="options-outline"
              size={22}
              color={currentQualityType === 'auto' ? '#71717a' : '#22c55e'}
            />
          </Pressable>
        </View>

        <View className="flex-1 items-center pt-3">
          <Text className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Now Playing
          </Text>
        </View>

        <Pressable
          onPress={() => setShowPlaylistModal(true)}
          className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80">
          <Ionicons name="add" size={24} color="#22c55e" />
        </Pressable>
      </View>

      {/* ── Album Art ── */}
      <View className="flex-1 items-center justify-center px-6">
        <View
          style={{ width: ART_SIZE, height: ART_SIZE, borderRadius: 28 }}
          className="overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl">
          {coverImage ? (
            <Image
              source={{ uri: coverImage }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-green-500/5">
              <Ionicons name="musical-notes" size={80} color="#22c55e" />
            </View>
          )}
          {isBuffering && (
            <View className="absolute inset-0 items-center justify-center bg-black/40">
              <ActivityIndicator color="#22c55e" size="large" />
            </View>
          )}
        </View>
      </View>

      {/* ── Song Info + Controls ── */}
      <View className="px-8 pb-12 pt-8">
        <View className="mb-10 flex-row items-center justify-between">
          <View className="mr-4 flex-1">
            <Text className="text-2xl font-black tracking-tight text-white" numberOfLines={1}>
              {capitalize(currentSong.title || '')}
            </Text>
            <Text className="mt-1 text-base font-semibold text-zinc-400" numberOfLines={1}>
              {capitalize(currentSong.artistName || '')}
            </Text>
          </View>
          <Pressable
            onPress={() => favMutation.mutate()}
            disabled={favMutation.isPending}
            className="h-12 w-12 items-center justify-center rounded-full border border-white/5 bg-zinc-900/80">
            {favMutation.isPending ? (
              <ActivityIndicator color="#22c55e" size="small" />
            ) : (
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={isLiked ? '#ef4444' : '#a1a1aa'}
              />
            )}
          </Pressable>
        </View>

        <View className="mb-8">
          <Pressable
            onPress={(e) => {
              const x = e.nativeEvent.locationX;
              const barWidth = SCREEN_WIDTH - 64;
              const ratio = Math.max(0, Math.min(1, x / barWidth));
              seekTo(ratio * duration);
            }}
            className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <View
              className="absolute h-full rounded-xl bg-white/90"
              style={{ width: `${duration > 0 ? (bufferedPosition / duration) * 100 : 0}%` }}
            />
            <View
              className="h-full rounded-full bg-green-500"
              style={{ width: `${progress * 100}%` }}
            />
          </Pressable>
          <View className="mt-2.5 flex-row justify-between">
            <Text className="text-xs font-bold text-zinc-500">{formatTime(position)}</Text>
            <Text className="text-xs font-bold text-zinc-500">{formatTime(duration)}</Text>
          </View>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="h-12 w-12" />
          <View className="flex-row items-center gap-8">
            <Pressable className="h-14 w-14 items-center justify-center rounded-full active:bg-white/5">
              <Ionicons name="play-skip-back" size={28} color="#fff" />
            </Pressable>
            <Pressable
              onPress={togglePlayPause}
              className="h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl active:opacity-80">
              {isBuffering ? (
                <ActivityIndicator color="#000" size="large" />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={38}
                  color="#000"
                  style={!isPlaying ? { marginLeft: 4 } : undefined}
                />
              )}
            </Pressable>
            <Pressable className="h-14 w-14 items-center justify-center rounded-full active:bg-white/5">
              <Ionicons name="play-skip-forward" size={28} color="#fff" />
            </Pressable>
          </View>
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() => router.push('/lyrics')}
              className="h-12 w-12 items-center justify-center rounded-full bg-green-500/10 active:bg-green-500/20">
              <Ionicons name="text" size={20} color="#22c55e" />
            </Pressable>
            <Pressable className="h-12 w-12 items-center justify-center rounded-full active:bg-white/5">
              <Ionicons name="repeat" size={24} color="#71717a" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Quality Modal */}
      <Modal visible={showQualityModal} animationType="fade" transparent>
        <Pressable
          onPress={() => setShowQualityModal(false)}
          className="flex-1 items-center justify-center bg-black/80 px-6">
          <View className="w-full rounded-[32px] border border-white/10 bg-zinc-950 p-8">
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-xl font-black text-white">Playback Quality</Text>
              <Pressable onPress={() => setShowQualityModal(false)}>
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </Pressable>
            </View>

            <View className="mb-6 gap-2">
              {qualityOptions.map((opt) => {
                const isActive = currentQualityType === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      setQualityType(opt.id);
                      setShowQualityModal(false);
                    }}
                    className={`flex-row items-center justify-between rounded-2xl border px-5 py-4 ${
                      isActive
                        ? 'border-green-500/50 bg-green-500/5'
                        : 'border-white/5 bg-zinc-900/50'
                    }`}>
                    <View className="flex-row items-center gap-4">
                      <Ionicons
                        name={opt.icon}
                        size={20}
                        color={isActive ? '#22c55e' : '#52525b'}
                      />
                      <View>
                        <Text
                          className={`text-base font-bold ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                          {opt.label}
                        </Text>
                        <Text className="text-[10px] font-semibold text-zinc-600">
                          {opt.description}
                        </Text>
                      </View>
                    </View>
                    {isActive && <Ionicons name="checkmark-circle" size={24} color="#22c55e" />}
                  </Pressable>
                );
              })}
            </View>

            <Text className="mt-2 px-4 text-center text-[10px] leading-4 text-zinc-500">
              Selecting a quality will reload the stream at the target bitrate. "High" picks the top
              manifest level available.
            </Text>

            <Pressable
              onPress={() => setShowQualityModal(false)}
              className="mt-8 h-12 items-center justify-center rounded-2xl bg-white active:opacity-90">
              <Text className="font-bold text-black">Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showPlaylistModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="rounded-t-[32px] border-t border-white/10 bg-zinc-950 px-6 pb-12 pt-8">
            <Text className="mb-2 text-center text-xl font-black tracking-tight text-white">
              Add to Playlist
            </Text>
            <Text className="mb-6 text-center text-sm text-zinc-500">Choose a playlist</Text>

            {playlists.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-base text-zinc-500">No playlists yet</Text>
                <Text className="mt-1 text-sm text-zinc-600">Create one in the Playlists tab</Text>
              </View>
            ) : (
              <FlatList
                data={playlists}
                keyExtractor={(item: any) => item.id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }: { item: any }) => (
                  <Pressable
                    onPress={() => addToPlaylistMutation.mutate(item.id)}
                    disabled={addToPlaylistMutation.isPending}
                    className="flex-row items-center gap-3 rounded-xl px-2 py-3 active:bg-white/5">
                    <View className="h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-zinc-800">
                      <Ionicons name="musical-notes" size={20} color="#22c55e" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-white" numberOfLines={1}>
                        {capitalize(item.title)}
                      </Text>
                      <Text className="text-xs font-semibold text-zinc-500">
                        {item.songs?.length || 0} songs
                      </Text>
                    </View>
                    {addToPlaylistMutation.isPending ? (
                      <ActivityIndicator color="#22c55e" size="small" />
                    ) : (
                      <Ionicons name="add-circle-outline" size={22} color="#22c55e" />
                    )}
                  </Pressable>
                )}
              />
            )}

            <Pressable
              onPress={() => setShowPlaylistModal(false)}
              className="mt-4 h-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900">
              <Text className="font-bold text-zinc-400">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
