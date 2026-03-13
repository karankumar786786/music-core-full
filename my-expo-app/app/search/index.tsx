import { useState, useRef, useCallback, useEffect } from 'react';
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
  const [searchEnabled, setSearchEnabled] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const { play } = usePlayer();

  // ✅ Only runs on mount — not on app foreground/background or tab switch
  useEffect(() => {
    setQuery('');
    setDebouncedQuery('');
    setSearchEnabled(false);
    queryClient.removeQueries({ queryKey: ['search'] });

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleTextChange = useCallback((text: string) => {
    setQuery(text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim().length === 0) {
      setDebouncedQuery('');
      setSearchEnabled(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      const trimmed = text.trim();
      setDebouncedQuery(trimmed);
      setSearchEnabled(true);
    }, 300);
  }, []);

  const { data: searchData, isLoading, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      const response = await musicApi.search(debouncedQuery);
      console.log('RAW API RESPONSE:', JSON.stringify(response, null, 2));
      return response;
    },
    enabled: searchEnabled && debouncedQuery.length > 0,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: historyData } = useQuery({
    queryKey: ['searchHistory'],
    queryFn: () => musicApi.getSearchHistory(),
  });

  const saveHistoryMutation = useMutation({
    mutationFn: (searchString: string) => musicApi.addSearchHistory({ searchString }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory'] });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => musicApi.clearSearchHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory'] });
    },
  });

  const parseResults = (data: any) => {
    if (!data) return { songs: [], artists: [], playlists: [] };
    const root = data?.data ?? data;
    return {
      songs: root?.songs ?? root?.data?.songs ?? [],
      artists: root?.artists ?? root?.data?.artists ?? [],
      playlists: root?.playlists ?? root?.data?.playlists ?? [],
    };
  };

  const { songs, artists, playlists } = parseResults(searchData);
  const hasSongs = songs.length > 0;
  const hasArtists = artists.length > 0;
  const hasPlaylists = playlists.length > 0;
  const hasResults = hasSongs || hasArtists || hasPlaylists;

  const parseHistory = (data: any) => {
    if (!data) return [];
    return data?.data ?? data ?? [];
  };
  const searchHistory = parseHistory(historyData);
  const showHistory = !debouncedQuery && searchHistory.length > 0;

  const handleSaveHistory = (searchString: string) => {
    const exists = searchHistory.some(
      (item: any) => item.searchString?.toLowerCase() === searchString.toLowerCase()
    );
    if (!exists) saveHistoryMutation.mutate(searchString);
  };

  const handleClear = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setQuery('');
    setDebouncedQuery('');
    setSearchEnabled(false);
    queryClient.removeQueries({ queryKey: ['search'] });
    inputRef.current?.focus();
  };

  const isSearching = searchEnabled && debouncedQuery.length > 0 && (isLoading || isFetching);
  const showNoResults = searchEnabled && debouncedQuery.length > 0 && !isLoading && !isFetching && !hasResults;
  const showResults = searchEnabled && debouncedQuery.length > 0 && !isLoading && !isFetching && hasResults;

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <LinearGradient
        colors={['#1a1a1a', '#050505']}
        className="absolute inset-0"
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />

      {/* Header */}
      <View className="flex-row items-center px-4 pb-2 pt-6">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20">
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </Pressable>
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
            autoCorrect={false}
            autoCapitalize="none"
            onSubmitEditing={() => {
              const trimmed = query.trim();
              if (trimmed.length > 0) handleSaveHistory(trimmed);
            }}
          />
          {query.length > 0 && (
            <Pressable
              onPress={handleClear}
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

        {/* Search History */}
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
                    const s = item.searchString;
                    setQuery(s);
                    setDebouncedQuery(s);
                    setSearchEnabled(true);
                  }}
                  className="flex-row items-center gap-4 rounded-2xl py-3 active:bg-white/10">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-zinc-900/50">
                    <Ionicons name="time-outline" size={18} color="#71717a" />
                  </View>
                  <Text className="flex-1 text-[16px] font-semibold text-zinc-300" numberOfLines={1}>
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

        {/* Empty state */}
        {!debouncedQuery && !showHistory && (
          <View className="items-center py-20">
            <Ionicons name="search" size={48} color="#3f3f46" />
            <Text className="mt-4 text-base text-zinc-500">
              Search for songs, artists, or playlists
            </Text>
          </View>
        )}

        {/* Loading */}
        {isSearching && (
          <View className="items-center py-12">
            <ActivityIndicator color="#22c55e" size="large" />
          </View>
        )}

        {/* No results */}
        {showNoResults && (
          <View className="items-center py-20">
            <Ionicons name="sad-outline" size={48} color="#3f3f46" />
            <Text className="mt-4 text-base text-zinc-500">
              No results for "{debouncedQuery}"
            </Text>
          </View>
        )}

        {/* Results */}
        {showResults && (
          <View className="gap-10 pb-20">

            {hasSongs && (
              <View>
                <View className="mb-4 flex-row items-center justify-between px-6">
                  <Text className="text-2xl font-black tracking-tight text-white">Songs</Text>
                </View>
                <View className="px-2">
                  {songs.map((song: any, index: number) => (
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

            {hasArtists && (
              <View>
                <Text className="mb-4 px-6 text-2xl font-black tracking-tight text-white">
                  Artists
                </Text>
                <View className="px-2">
                  {artists.map((artist: any) => {
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
                            <Image source={{ uri: avatarUrl }} className="h-full w-full" resizeMode="cover" />
                          ) : (
                            <View className="h-full w-full items-center justify-center bg-zinc-800">
                              <Text className="text-xl font-black text-white/20">
                                {artist.artistName?.[0]?.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-[17px] font-black tracking-tight text-white" numberOfLines={1}>
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

            {hasPlaylists && (
              <View>
                <Text className="mb-4 px-6 text-2xl font-black tracking-tight text-white">
                  Playlists
                </Text>
                <View className="px-2">
                  {playlists.map((playlist: any) => {
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
                            <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
                          ) : (
                            <View className="h-full w-full items-center justify-center bg-zinc-800">
                              <Ionicons name="musical-notes-outline" size={24} color="#3f3f46" />
                            </View>
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-[17px] font-black tracking-tight text-white" numberOfLines={1}>
                            {capitalize(playlist.title)}
                          </Text>
                          <Text className="mt-0.5 text-[13px] font-medium text-zinc-500" numberOfLines={1}>
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