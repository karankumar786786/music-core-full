import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import SongRow from '../../components/SongRow';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../../lib/player-context';

export default function SearchTab() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { play } = usePlayer();
  const queryClient = useQueryClient();

  useEffect(() => {
    // If query is empty, clear debounced query immediately
    if (!query.trim()) {
      setDebouncedQuery('');
      setIsDebouncing(false);
      return;
    }

    // Set debouncing state for instant UI feedback
    setIsDebouncing(true);

    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setIsDebouncing(false);
    }, 500);

    return () => clearTimeout(handler);
  }, [query]);

  const handleTextChange = (text: string) => {
    setQuery(text);
  };

  const trimmedQuery = query.trim();

  // Search query
  const {
    data,
    isLoading: isInitialLoading,
    isFetching,
  } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => musicApi.search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 30000,
  });

  const isPending = isFetching || isDebouncing;

  // Search history
  const { data: historyData } = useQuery({
    queryKey: ['searchHistory'],
    queryFn: () => musicApi.getSearchHistory(),
  });

  // Save search history when a search is performed
  const saveHistoryMutation = useMutation({
    mutationFn: (searchString: string) => musicApi.addSearchHistory({ searchString }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory'] });
    },
  });

  // Clear search history
  const clearHistoryMutation = useMutation({
    mutationFn: () => musicApi.clearSearchHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory'] });
    },
  });

  // Save history when debounced query changes (and is meaningful)
  // Replaced with on-tap save to match web frontend

  const results = data?.data;
  const hasSongs = results?.songs?.length > 0;
  const hasArtists = results?.artists?.length > 0;
  const hasPlaylists = results?.playlists?.length > 0;
  const hasResults = hasSongs || hasArtists || hasPlaylists;

  const searchHistory = historyData || [];
  // Hide history immediately when user starts typing (matching web)
  const showHistory = !query && searchHistory.length > 0;

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
      <LinearGradient
        colors={['#1a1a1a', '#050505']}
        className="absolute inset-0"
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
      {/* Title */}
      <View className="px-6 pb-2 pt-6">
        <Text className="text-4xl font-black tracking-tighter text-white">Search</Text>
      </View>

      {/* Search Bar */}
      <View className="px-6 py-4">
        <View
          style={{ overflow: 'hidden' }}
          className="h-16 flex-row items-center rounded-3xl border border-white/10 bg-white/10 px-6 shadow-2xl">
          <Ionicons name="search" size={22} color="#71717a" />
          <TextInput
            ref={inputRef}
            className="ml-4 flex-1 text-[18px] font-bold text-white"
            placeholder="Artists, songs, or lyrics..."
            placeholderTextColor="#52525b"
            value={query}
            onChangeText={handleTextChange}
            returnKeyType="search"
            selectionColor="#22c55e"
            onSubmitEditing={() => {
              const trimmed = query.trim();
              if (trimmed.length > 0) {
                handleSaveHistory(trimmed);
              }
            }}
          />
          {isPending && (
            <View className="mr-2">
              <ActivityIndicator color="#22c55e" size="small" />
            </View>
          )}
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery('');
              }}
              hitSlop={15}
              className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <Ionicons name="close" size={18} color="#a1a1aa" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Search History (when no query) */}
        {showHistory && (
          <View className="px-6 pb-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Recent Searches
              </Text>
              <Pressable
                onPress={() => clearHistoryMutation.mutate()}
                className="rounded-full bg-white/5 px-3 py-1.5 active:bg-white/10">
                <Text className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Clear All
                </Text>
              </Pressable>
            </View>
            <View className="gap-1">
              {searchHistory.slice(0, 10).map((item: any, index: number) => (
                <Pressable
                  key={item.id || index}
                  onPress={() => {
                    const text = item.searchString;
                    setQuery(text);
                    // Instant update for history clicks
                    setDebouncedQuery(text);
                    setIsDebouncing(false);
                  }}
                  className="flex-row items-center gap-4 rounded-2xl py-3 active:bg-white/10">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-zinc-900/50">
                    <Ionicons name="time-outline" size={18} color="#71717a" />
                  </View>
                  <Text
                    className="flex-1 text-[16px] font-semibold text-zinc-300"
                    numberOfLines={1}>
                    {item.searchString}
                  </Text>
                  <Ionicons
                    name="arrow-up-outline"
                    size={16}
                    color="#3f3f46"
                    style={{ transform: [{ rotate: '-45deg' }] }}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Empty state (no query, no history) */}
        {!query && !showHistory && (
          <View className="items-center py-20">
            <Ionicons name="search" size={48} color="#3f3f46" />
            <Text className="mt-4 text-base text-zinc-500">
              Search for songs, artists, or playlists
            </Text>
          </View>
        )}

        {/* Initial Loading (no data yet) */}
        {debouncedQuery.trim().length > 0 && isInitialLoading && !hasResults && (
          <View className="items-center py-20">
            <ActivityIndicator color="#22c55e" size="large" />
            <Text className="mt-4 text-xs font-black uppercase tracking-widest text-zinc-600">
              Searching...
            </Text>
          </View>
        )}

        {/* No results (only show when not loading to avoid flickering) */}
        {debouncedQuery.trim().length > 0 && !isPending && !hasResults && (
          <View className="items-center py-20">
            <Ionicons name="sad-outline" size={48} color="#3f3f46" />
            <Text className="mt-4 text-base text-zinc-500">
              No results for &quot;{debouncedQuery}&quot;
            </Text>
          </View>
        )}

        {/* Results - Keep visible during re-fetches */}
        {debouncedQuery.trim().length > 0 && hasResults && (
          <View className="gap-10 pb-20">
            {/* Songs */}
            {hasSongs && (
              <View>
                <View className="mb-4 flex-row items-center justify-between px-6">
                  <Text className="text-2xl font-black tracking-tight text-white">Songs</Text>
                </View>
                <View className="px-2">
                  {results.songs.map((song: any, index: number) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      index={index}
                      onPress={() => {
                        handleSaveHistory(song.title);
                        play({
                          id: song.id,
                          title: song.title,
                          artistName: song.artistName,
                          storageKey: song.storageKey,
                          coverUrl: getCoverImageUrl(song.storageKey, 'large', true) || null,
                        });
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Artists */}
            {hasArtists && (
              <View>
                <Text className="mb-4 px-6 text-2xl font-black tracking-tight text-white">
                  Artists
                </Text>
                <View className="px-2">
                  {results.artists.map((artist: any) => {
                    const avatarUrl = getCoverImageUrl(artist.storageKey, 'small') || null;
                    return (
                      <Pressable
                        key={artist.id}
                        onPress={() => {
                          handleSaveHistory(artist.artistName);
                          router.push(`/artist/${artist.id}`);
                        }}
                        className="flex-row items-center gap-4 rounded-3xl px-4 py-3 active:bg-white/10">
                        <View className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-zinc-900 shadow-2xl">
                          {avatarUrl ? (
                            <Image
                              source={{ uri: avatarUrl }}
                              className="h-full w-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="h-full w-full items-center justify-center bg-zinc-800">
                              <Text className="text-xl font-black text-white/20">
                                {artist.artistName?.[0]?.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-[17px] font-black tracking-tight text-white"
                            numberOfLines={1}>
                            {capitalize(artist.artistName)}
                          </Text>
                          <Text className="mt-0.5 text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
                            Artist
                          </Text>
                        </View>
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/5">
                          <Ionicons name="chevron-forward" size={18} color="#52525b" />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Playlists */}
            {hasPlaylists && (
              <View>
                <Text className="mb-4 px-6 text-2xl font-black tracking-tight text-white">
                  Playlists
                </Text>
                <View className="px-2">
                  {results.playlists.map((playlist: any) => {
                    const coverUrl = getCoverImageUrl(playlist.storageKey, 'small') || null;
                    return (
                      <Pressable
                        key={playlist.id}
                        onPress={() => {
                          handleSaveHistory(playlist.title);
                          router.push(`/playlist/${playlist.id}`);
                        }}
                        className="flex-row items-center gap-4 rounded-3xl px-4 py-3 active:bg-white/10">
                        <View className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
                          {coverUrl ? (
                            <Image
                              source={{ uri: coverUrl }}
                              className="h-full w-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="h-full w-full items-center justify-center bg-zinc-800">
                              <Ionicons name="musical-notes-outline" size={24} color="#3f3f46" />
                            </View>
                          )}
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-[17px] font-black tracking-tight text-white"
                            numberOfLines={1}>
                            {capitalize(playlist.title)}
                          </Text>
                          <Text
                            className="mt-0.5 text-[13px] font-medium text-zinc-500"
                            numberOfLines={1}>
                            {playlist.description || 'Curated Playlist'}
                          </Text>
                        </View>
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/5">
                          <Ionicons name="chevron-forward" size={18} color="#52525b" />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
