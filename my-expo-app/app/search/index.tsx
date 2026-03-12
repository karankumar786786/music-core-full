import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import SongRow from '../../components/SongRow';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus the input after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Debounce: update debouncedQuery 500ms after user stops typing
  const handleTextChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const trimmed = text.trim();
      if (trimmed.length >= 2) {
        setDebouncedQuery(trimmed);
      } else if (trimmed.length === 0) {
        setDebouncedQuery('');
      }
    }, 500);
  }, []);

  // Search query
  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => musicApi.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  // Search history
  const { data: historyData } = useQuery({
    queryKey: ['searchHistory'],
    queryFn: () => musicApi.getSearchHistory(),
  });

  // Save search history when a search is performed
  const saveHistoryMutation = useMutation({
    mutationFn: (searchString: string) => musicApi.addSearchHistory({ searchString }),
  });

  // Save history when debounced query changes (and is meaningful)
  // Replaced with on-tap save to match web frontend

  const results = data?.data;
  const hasSongs = results?.songs?.length > 0;
  const hasArtists = results?.artists?.length > 0;
  const hasPlaylists = results?.playlists?.length > 0;
  const hasResults = hasSongs || hasArtists || hasPlaylists;

  const searchHistory = historyData || [];
  const showHistory = !debouncedQuery && searchHistory.length > 0;

  const handleSaveHistory = (searchString: string) => {
    const exists = searchHistory.some(
      (item: any) => item.searchString.toLowerCase() === searchString.toLowerCase()
    );
    if (!exists) {
      saveHistoryMutation.mutate(searchString);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      {/* Back + Title */}
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-zinc-900">
          <Ionicons name="arrow-back" size={20} color="#a1a1aa" />
        </Pressable>
        <Text className="text-xl font-black tracking-tight text-white">Search</Text>
      </View>

      {/* Search Bar */}
      <View className="px-4 py-3">
        <View className="h-12 flex-row items-center rounded-2xl border border-white/10 bg-zinc-900 px-4">
          <Ionicons name="search" size={18} color="#71717a" />
          <TextInput
            ref={inputRef}
            className="ml-3 flex-1 text-base text-white"
            placeholder="Songs, artists, or playlists..."
            placeholderTextColor="#52525b"
            value={query}
            onChangeText={handleTextChange}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery('');
                setDebouncedQuery('');
              }}>
              <Ionicons name="close-circle" size={20} color="#71717a" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled">
        {/* Search History (when no query) */}
        {showHistory && (
          <View className="px-4 pb-4">
            <Text className="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-500">
              Recent Searches
            </Text>
            {searchHistory.slice(0, 10).map((item: any, index: number) => (
              <Pressable
                key={item.id || index}
                onPress={() => {
                  setQuery(item.searchString);
                  setDebouncedQuery(item.searchString);
                }}
                className="flex-row items-center gap-3 rounded-xl py-2.5 active:bg-white/5">
                <Ionicons name="time-outline" size={16} color="#52525b" />
                <Text className="flex-1 text-base font-medium text-zinc-300" numberOfLines={1}>
                  {item.searchString}
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#3f3f46" />
              </Pressable>
            ))}
          </View>
        )}

        {/* Empty state (no query, no history) */}
        {!debouncedQuery && !showHistory && (
          <View className="items-center py-20">
            <Ionicons name="search" size={48} color="#3f3f46" />
            <Text className="mt-4 text-base text-zinc-500">
              Search for songs, artists, or playlists
            </Text>
          </View>
        )}

        {/* Loading */}
        {debouncedQuery && isLoading && (
          <View className="items-center py-12">
            <ActivityIndicator color="#22c55e" size="large" />
          </View>
        )}

        {/* No results */}
        {debouncedQuery && !isLoading && !hasResults && (
          <View className="items-center py-20">
            <Ionicons name="sad-outline" size={48} color="#3f3f46" />
            <Text className="mt-4 text-base text-zinc-500">No results for "{debouncedQuery}"</Text>
          </View>
        )}

        {/* Results */}
        {debouncedQuery && !isLoading && hasResults && (
          <View className="gap-8 pb-20">
            {/* Songs */}
            {hasSongs && (
              <View>
                <Text className="mb-3 px-4 text-xl font-black tracking-tight text-white">
                  Songs
                </Text>
                {results.songs.map((song: any, index: number) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={index}
                    onPress={() => handleSaveHistory(song.title)}
                  />
                ))}
              </View>
            )}

            {/* Artists */}
            {hasArtists && (
              <View>
                <Text className="mb-3 px-4 text-xl font-black tracking-tight text-white">
                  Artists
                </Text>
                {results.artists.map((artist: any) => {
                  const avatarUrl = getCoverImageUrl(artist.storageKey, 'small') || null;
                  return (
                    <Pressable
                      key={artist.id}
                      onPress={() => {
                        handleSaveHistory(artist.artistName);
                        router.push(`/artist/${artist.id}`);
                      }}
                      className="flex-row items-center gap-4 rounded-2xl px-4 py-3 active:bg-white/5">
                      <View className="h-14 w-14 overflow-hidden rounded-full border-2 border-green-500/20 bg-zinc-800">
                        {avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            className="h-full w-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-full w-full items-center justify-center bg-green-500/10">
                            <Text className="text-lg font-black text-green-500">
                              {artist.artistName?.[0]?.toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-white" numberOfLines={1}>
                          {capitalize(artist.artistName)}
                        </Text>
                        <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                          Artist
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#52525b" />
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Playlists */}
            {hasPlaylists && (
              <View>
                <Text className="mb-3 px-4 text-xl font-black tracking-tight text-white">
                  Playlists
                </Text>
                {results.playlists.map((playlist: any) => {
                  const coverUrl = getCoverImageUrl(playlist.storageKey, 'small') || null;
                  return (
                    <Pressable
                      key={playlist.id}
                      onPress={() => {
                        handleSaveHistory(playlist.title);
                        router.push(`/playlist/${playlist.id}`);
                      }}
                      className="flex-row items-center gap-4 rounded-2xl px-4 py-3 active:bg-white/5">
                      <View className="h-14 w-14 overflow-hidden rounded-xl border border-white/5 bg-zinc-800">
                        {coverUrl ? (
                          <Image
                            source={{ uri: coverUrl }}
                            className="h-full w-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-full w-full items-center justify-center">
                            <Ionicons name="list" size={24} color="#3f3f46" />
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-white" numberOfLines={1}>
                          {capitalize(playlist.title)}
                        </Text>
                        <Text className="text-xs font-semibold text-zinc-500">
                          {playlist.description || 'Playlist'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#52525b" />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
