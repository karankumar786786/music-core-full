import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { musicApi } from '../../lib/api';
import { getCoverImageUrl } from '../../lib/s3';
import { capitalize } from '../../lib/utils';
import SongRow from '../../components/SongRow';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../../lib/player-context';

export default function SearchTab() {
  console.log('[SearchTab] Component Rendered');

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { play } = usePlayer();
  const queryClient = useQueryClient();

  // Handle screen focus/blur
  useFocusEffect(
    useCallback(() => {
      console.log('[SearchTab] Screen is FOCUSED');
      return () => {
        console.log('[SearchTab] Screen is BLURRED (Navigating away). Dismissing keyboard & dropping focus.');
        Keyboard.dismiss();
        inputRef.current?.blur();
      };
    }, [])
  );

  // Debounce logic
  useEffect(() => {
    console.log(`[SearchTab] useEffect Triggered | Current Query: "${query}"`);
    if (!query.trim()) {
      console.log('[SearchTab] Query is empty. Clearing debounced state immediately.');
      setDebouncedQuery('');
      setIsDebouncing(false);
      return;
    }

    console.log('[SearchTab] Setting isDebouncing to true...');
    setIsDebouncing(true);

    const handler = setTimeout(() => {
      const trimmed = query.trim();
      console.log(`[SearchTab] Debounce Timeout Finished. Setting debouncedQuery to: "${trimmed}"`);
      setDebouncedQuery(trimmed);
      setIsDebouncing(false);
    }, 500);

    return () => {
      console.log('[SearchTab] Cleaning up previous debounce timer.');
      clearTimeout(handler);
    };
  }, [query]);

  const handleTextChange = (text: string) => {
    console.log(`[SearchTab] User typing... Raw Text: "${text}"`);
    setQuery(text);
  };

  const trimmedQuery = query.trim();

  // Search API Call
  console.log(`[SearchTab] Preparing Search Query Hook for: "${debouncedQuery}"`);
  const {
    data,
    isLoading: isInitialLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => {
      console.log(`[SearchTab] 🔥 Firing API Request for: "${debouncedQuery}"`);
      return musicApi.search(debouncedQuery);
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 30000,
    retry: 1,
  });

  if (isFetching) console.log('[SearchTab] React Query: isFetching is TRUE');
  if (isError) console.error('[SearchTab] React Query: ERROR caught:', error);

  const isPending = isFetching || isDebouncing;

  // Search History API
  const { data: historyData } = useQuery({
    queryKey: ['searchHistory'],
    queryFn: () => {
      console.log('[SearchTab] Fetching Search History');
      return musicApi.getSearchHistory();
    },
  });

  const saveHistoryMutation = useMutation({
    mutationFn: (searchString: string) => {
      console.log(`[SearchTab] Saving to History: "${searchString}"`);
      return musicApi.addSearchHistory({ searchString });
    },
    onSuccess: () => {
      console.log('[SearchTab] History saved successfully, invalidating query cache.');
      queryClient.invalidateQueries({ queryKey: ['searchHistory'] });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => {
      console.log('[SearchTab] Clearing all search history...');
      return musicApi.clearSearchHistory();
    },
    onSuccess: () => {
      console.log('[SearchTab] History cleared successfully.');
      queryClient.invalidateQueries({ queryKey: ['searchHistory'] });
    },
  });

  const results = data?.data || data;
  const hasSongs = results?.songs?.length > 0;
  const hasArtists = results?.artists?.length > 0;
  const hasPlaylists = results?.playlists?.length > 0;
  const hasResults = hasSongs || hasArtists || hasPlaylists;

  if (data && debouncedQuery) {
    console.log(`[SearchTab] Results found: ${results?.songs?.length || 0} Songs, ${results?.artists?.length || 0} Artists, ${results?.playlists?.length || 0} Playlists.`);
  }

  const searchHistory = historyData || [];
  const showHistory = !trimmedQuery && searchHistory.length > 0;

  const handleSaveHistory = (searchString: string) => {
    console.log(`[SearchTab] handleSaveHistory checking for: "${searchString}"`);
    const exists = searchHistory.some(
      (item: any) => item.searchString.toLowerCase() === searchString.toLowerCase()
    );
    if (!exists) {
      saveHistoryMutation.mutate(searchString);
    } else {
      console.log(`[SearchTab] History item "${searchString}" already exists. Skipping save.`);
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
      <View className="px-6 pb-2 pt-6">
        <Text className="text-4xl font-black tracking-tighter text-white">Search</Text>
      </View>

      <View className="px-6 py-4">
        <View className="h-16 flex-row items-center rounded-3xl border border-white/10 bg-white/10 px-6 shadow-2xl">
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
            spellCheck={false}
            onFocus={() => console.log('[SearchTab] TextInput is FOCUSED')}
            onBlur={() => console.log('[SearchTab] TextInput is BLURRED')}
            onSubmitEditing={() => {
              console.log('[SearchTab] Enter/Search button pressed on keyboard.');
              if (trimmedQuery.length > 0) {
                handleSaveHistory(trimmedQuery);
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
                console.log('[SearchTab] User clicked clear button inside input.');
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
        keyboardDismissMode="on-drag"
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
                    console.log(`[SearchTab] Clicked History Item: "${item.searchString}"`);
                    const text = item.searchString;
                    setQuery(text);
                    setDebouncedQuery(text);
                    setIsDebouncing(false);
                  }}
                  className="flex-row items-center gap-4 rounded-2xl py-3 active:bg-white/10">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-zinc-900/50">
                    <Ionicons name="time-outline" size={18} color="#71717a" />
                  </View>
                  <Text className="flex-1 text-[16px] font-semibold text-zinc-300" numberOfLines={1}>
                    {item.searchString}
                  </Text>
                  <Ionicons name="arrow-up-outline" size={16} color="#3f3f46" style={{ transform: [{ rotate: '-45deg' }] }} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {!trimmedQuery && !showHistory && (
          <View className="items-center py-20">
            <Ionicons name="search" size={48} color="#3f3f46" />
            <Text className="mt-4 text-base text-zinc-500">Search for songs, artists, or playlists</Text>
          </View>
        )}

        {debouncedQuery.trim().length > 0 && isInitialLoading && !hasResults && !isError && (
          <View className="items-center py-20">
            <ActivityIndicator color="#22c55e" size="large" />
            <Text className="mt-4 text-xs font-black uppercase tracking-widest text-zinc-600">Searching...</Text>
          </View>
        )}

        {debouncedQuery.trim().length > 0 && isError && (
          <View className="items-center py-20">
            <Ionicons name="warning-outline" size={48} color="#ef4444" />
            <Text className="mt-4 text-base text-zinc-400">Something went wrong.</Text>
            <Pressable 
              onPress={() => {
                console.log('[SearchTab] User clicked Try Again on error state.');
                queryClient.invalidateQueries({ queryKey: ['search'] });
              }}
              className="mt-4 rounded-full bg-white/10 px-6 py-2">
              <Text className="font-bold text-white">Try Again</Text>
            </Pressable>
          </View>
        )}

        {debouncedQuery.trim().length > 0 && !isPending && !hasResults && !isError && (
          <View className="items-center py-20">
            <Ionicons name="sad-outline" size={48} color="#3f3f46" />
            <Text className="mt-4 text-base text-zinc-500">No results for &quot;{debouncedQuery}&quot;</Text>
          </View>
        )}

        {/* Results */}
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
                        console.log(`[SearchTab] Clicked Song: "${song.title}"`);
                        Keyboard.dismiss();
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
                <Text className="mb-4 px-6 text-2xl font-black tracking-tight text-white">Artists</Text>
                <View className="px-2">
                  {results.artists.map((artist: any) => {
                    const avatarUrl = getCoverImageUrl(artist.storageKey, 'small') || null;
                    return (
                      <Pressable
                        key={artist.id}
                        onPress={() => {
                          console.log(`[SearchTab] Navigating to Artist: "${artist.artistName}" | ID: ${artist.id}`);
                          Keyboard.dismiss();
                          handleSaveHistory(artist.artistName);
                          router.push(`/artist/${artist.id}`);
                        }}
                        className="flex-row items-center gap-4 rounded-3xl px-4 py-3 active:bg-white/10">
                        <View className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-zinc-900 shadow-2xl">
                          {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} className="h-full w-full" resizeMode="cover" />
                          ) : (
                            <View className="h-full w-full items-center justify-center bg-zinc-800">
                              <Text className="text-xl font-black text-white/20">{(artist.artistName || 'A')[0]?.toUpperCase()}</Text>
                            </View>
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-[17px] font-black tracking-tight text-white" numberOfLines={1}>
                            {capitalize(artist.artistName || 'Unknown Artist')}
                          </Text>
                          <Text className="mt-0.5 text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">Artist</Text>
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
                <Text className="mb-4 px-6 text-2xl font-black tracking-tight text-white">Playlists</Text>
                <View className="px-2">
                  {results.playlists.map((playlist: any) => {
                    const coverUrl = getCoverImageUrl(playlist.storageKey, 'small') || null;
                    return (
                      <Pressable
                        key={playlist.id}
                        onPress={() => {
                          console.log(`[SearchTab] Navigating to Playlist: "${playlist.title}" | ID: ${playlist.id}`);
                          Keyboard.dismiss();
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
                            {capitalize(playlist.title || 'Unknown Playlist')}
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