import React from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlayer } from '../lib/player-context';
import { getCoverImageUrl } from '../lib/s3';
import { capitalize } from '../lib/utils';
import { musicApi } from '../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlayerScreen() {
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const queryClient = useQueryClient();
  const { currentSong, isPlaying, isBuffering, duration, position, togglePlayPause, seekTo } =
    usePlayer();

  const [isLiked, setIsLiked] = React.useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = React.useState(false);

  // Fetch user playlists for the add-to-playlist modal
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
    onSuccess: () => {
      setIsLiked(!isLiked);
      queryClient.invalidateQueries({ queryKey: ['favourites'] });
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

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;
  const ART_SIZE = SCREEN_WIDTH - 64;

  const coverImage =
    currentSong?.coverUrl || getCoverImageUrl(currentSong?.storageKey || null, 'large', true);
  const title = currentSong?.title || '';
  const artistName = currentSong?.artistName || '';

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

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80">
          <Ionicons name="chevron-down" size={22} color="#a1a1aa" />
        </Pressable>
        <Text className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Now Playing
        </Text>
        {/* Add to Playlist button */}
        <Pressable
          onPress={() => setShowPlaylistModal(true)}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80">
          <Ionicons name="add" size={22} color="#22c55e" />
        </Pressable>
      </View>

      {/* Artwork */}
      <View className="flex-1 items-center justify-center px-8">
        <View
          style={{ width: ART_SIZE, height: ART_SIZE, borderRadius: 28 }}
          className="overflow-hidden border border-white/10 bg-zinc-900">
          {coverImage ? (
            <Image
              source={{ uri: coverImage }}
              style={{ width: ART_SIZE, height: ART_SIZE }}
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
              <Text className="mt-2 text-xs font-bold text-green-500">Buffering...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Song Info + Controls */}
      <View className="px-8 pb-8">
        {/* Title & Artist */}
        <View className="mb-8 flex-row items-center justify-between">
          <View className="mr-4 flex-1">
            <Text className="text-2xl font-black tracking-tight text-white" numberOfLines={1}>
              {capitalize(title)}
            </Text>
            <Text className="mt-1 text-base font-semibold text-zinc-400" numberOfLines={1}>
              {capitalize(artistName)}
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

        {/* Progress Bar */}
        <View className="mb-2">
          <Pressable
            onPress={(e) => {
              const x = e.nativeEvent.locationX;
              const width = SCREEN_WIDTH - 64;
              seekTo(Math.max(0, Math.min(1, x / width)));
            }}
            className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <View
              className="h-full rounded-full bg-green-500"
              style={{ width: `${progress * 100}%` }}
            />
          </Pressable>
          <View className="mt-2 flex-row justify-between">
            <Text className="text-xs font-bold text-zinc-500">{formatTime(position)}</Text>
            <Text className="text-xs font-bold text-zinc-500">{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View className="mt-4 flex-row items-center justify-center gap-6">
          <Pressable className="h-12 w-12 items-center justify-center rounded-full active:bg-white/5">
            <Ionicons name="shuffle" size={22} color="#71717a" />
          </Pressable>
          <Pressable className="h-14 w-14 items-center justify-center rounded-full active:bg-white/5">
            <Ionicons name="play-skip-back" size={26} color="#fff" />
          </Pressable>
          <Pressable
            onPress={togglePlayPause}
            className="h-20 w-20 items-center justify-center rounded-full bg-green-500 active:opacity-80">
            {isBuffering ? (
              <ActivityIndicator color="#000" size="large" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={36}
                color="#000"
                style={!isPlaying ? { marginLeft: 4 } : undefined}
              />
            )}
          </Pressable>
          <Pressable className="h-14 w-14 items-center justify-center rounded-full active:bg-white/5">
            <Ionicons name="play-skip-forward" size={26} color="#fff" />
          </Pressable>
          <Pressable className="h-12 w-12 items-center justify-center rounded-full active:bg-white/5">
            <Ionicons name="repeat" size={22} color="#71717a" />
          </Pressable>
        </View>
      </View>

      {/* Add to Playlist Modal */}
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
    </SafeAreaView>
  );
}
