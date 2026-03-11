import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { musicApi } from '../../lib/api';
import { capitalize } from '../../lib/utils';
import { getCoverImageUrl } from '../../lib/s3';

export default function UserPlaylists() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const {
    data: playlistsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['userPlaylists'],
    queryFn: () => musicApi.getUserPlaylists(),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => musicApi.createUserPlaylist({ title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
      setShowCreate(false);
      setNewTitle('');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to create playlist');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => musicApi.deleteUserPlaylist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
  });

  const playlists = playlistsData?.data || [];
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  const handleCreate = () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    createMutation.mutate(newTitle.trim());
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Playlist', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const renderPlaylist = ({ item }: { item: any }) => {
    const coverUrl =
      getCoverImageUrl(item.storageKey, 'medium') ||
      getCoverImageUrl(item.storageKey, 'small') ||
      null;
    return (
      <Pressable
        onPress={() => router.push(`/userplaylist/${item.id}`)}
        className="mx-4 mb-3 flex-row items-center rounded-2xl border border-white/5 bg-zinc-900/40 p-4 active:bg-white/5">
        {/* Art */}
        <View className="mr-4 h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-zinc-800">
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <Ionicons name="musical-notes" size={24} color="#22c55e" />
          )}
        </View>

        {/* Info */}
        <View className="min-w-0 flex-1">
          <Text className="text-base font-bold text-white" numberOfLines={1}>
            {capitalize(item.title)}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-zinc-500">
            {item.songs?.length || 0} songs · My Playlist
          </Text>
        </View>

        {/* Actions */}
        <Pressable
          onPress={() => handleDelete(item.id, item.title)}
          className="mr-1 h-9 w-9 items-center justify-center rounded-full active:bg-red-500/10">
          <Ionicons name="trash-outline" size={16} color="#71717a" />
        </Pressable>
        <Ionicons name="chevron-forward" size={18} color="#3f3f46" />
      </Pressable>
    );
  };

  // Full loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top']}>
        <View className="px-6 pb-2 pt-6">
          <Text className="text-3xl font-black tracking-tighter text-white">Your Playlists</Text>
        </View>
        <View className="mt-4 gap-3 px-4">
          {[1, 2, 3].map((i) => (
            <View key={i} className="mx-4 flex-row items-center rounded-2xl bg-zinc-900/30 p-4">
              <View className="h-16 w-16 rounded-xl bg-zinc-800" />
              <View className="ml-4 flex-1 gap-2">
                <View className="h-4 w-2/3 rounded bg-zinc-800" />
                <View className="h-3 w-1/3 rounded bg-zinc-800" />
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
          <Text className="text-3xl font-black tracking-tighter text-white">Your Playlists</Text>
          <Text className="mt-1 text-sm font-medium text-zinc-500">
            {playlists.length} playlists
          </Text>
        </View>
      </View>

      {/* Create Button */}
      <View className="px-4 py-3">
        {showCreate ? (
          <View className="flex-row items-center gap-2">
            <View className="h-12 flex-1 flex-row items-center rounded-2xl border border-white/10 bg-zinc-900 px-4">
              <TextInput
                className="flex-1 text-base text-white"
                placeholder="Playlist name..."
                placeholderTextColor="#52525b"
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
              />
            </View>
            <Pressable
              onPress={handleCreate}
              disabled={createMutation.isPending}
              className="h-12 w-12 items-center justify-center rounded-xl bg-green-500 active:opacity-80">
              {createMutation.isPending ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Ionicons name="checkmark" size={22} color="#000" />
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setShowCreate(false);
                setNewTitle('');
              }}
              className="h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-zinc-800">
              <Ionicons name="close" size={22} color="#a1a1aa" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowCreate(true)}
            className="h-12 flex-row items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10 active:bg-green-500/20">
            <Ionicons name="add" size={20} color="#22c55e" />
            <Text className="ml-2 font-bold text-green-500">Create Playlist</Text>
          </Pressable>
        )}
      </View>

      {/* List */}
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={renderPlaylist}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <View className="mb-5 h-24 w-24 items-center justify-center rounded-full border border-white/5 bg-zinc-900/60">
              <Ionicons name="albums-outline" size={40} color="#3f3f46" />
            </View>
            <Text className="text-lg font-bold text-zinc-400">No playlists yet</Text>
            <Text className="mt-2 px-12 text-center text-sm text-zinc-600">
              Create your first playlist to start organizing your music
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
      />
    </SafeAreaView>
  );
}
