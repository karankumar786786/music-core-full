import { useState, useRef, useCallback } from 'react';
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
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const { play } = usePlayer();

  const handleTextChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
    }, 300);
  }, []);

  const handleClear = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  }, []);

  // Search query
  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => musicApi.search(debouncedQuery),
    enabled: debouncedQuery.length > 1,
    // Keep previous results visible while new ones load — no flicker
    placeholderData: (prev: any) => prev,
  });

  // Search history
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

  const handleSaveHistory = useCallback(
    (searchString: string) => {
      const exists = (historyData || []).some(
        (item: any) => item.searchString.toLowerCase() === searchString.toLowerCase()
      );
      if (!exists) saveHistoryMutation.mutate(searchString);
    },
    [historyData, saveHistoryMutation]
  );

  const results = data?.data;
  const hasSongs = (results?.songs?.length ?? 0) > 0;
  const hasArtists = (results?.artists?.length ?? 0) > 0;
  const hasPlaylists = (results?.playlists?.length ?? 0) > 0;
  const hasResults = hasSongs || hasArtists || hasPlaylists;

  const searchHistory = historyData || [];
  const showHistory = !debouncedQuery && searchHistory.length > 0;

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
        <View className="h-14 flex-row items-center rounded-2xl border border-white/[0.08] bg-white/[0.05] px-5 shadow-lg">
          <Ionicons name="search" size={20} color="#52525b" />
          <TextInput
            ref={inputRef}
            className="ml-4 flex-1 text-[17px] font-bold text-white"
            placeholder="Songs, artists, or playlists..."
            placeholderTextColor="#3f3f46"
            value={query}
            onChangeText={handleTextChange}
            returnKeyType="search"
            // KEY FIX: never dismiss keyboard on submit — keeps results visible
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (query.trim().length > 1) {
                handleSaveHistory(query.trim());
              }
            }}
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={10}>
              <Ionicons name="close-circle" size={20} color="#52525b" />
            </Pressable>
          )}
        </View>
      </View>

      {/* KEY FIX: keyboardShouldPersistTaps="always" so tapping results
          never accidentally dismisses keyboard and re-triggers a state change */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag">
        {/* Search History */}
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

        {/* Empty state */}
        {!debouncedQuery && !showHistory && (
          <View className="items-center py-20">
            <Ionicons name="search" size={48} color="#3f3f46" />
            <Text className="mt-4 text-base text-zinc-500">
              Search for songs, artists, or playlists
            </Text>
          </View>
        )}

        {/* Loading — only show spinner on fresh search, not on refetch */}
        {debouncedQuery.length > 1 && isLoading && !hasResults && (
          <View className="items-center py-12">
            <ActivityIndicator color="#22c55e" size="large" />
          </View>
        )}

        {/* No results */}
        {debouncedQuery.length > 1 && !isLoading && !hasResults && (
          <View className="items-center py-20">
            <Ionicons name="sad-outline" size={48} color="#3f3f46" />
            <Text className="mt-4 text-base text-zinc-500">No results for "{debouncedQuery}"</Text>
          </View>
        )}

        {/* Results */}
        {hasResults && (
          <View className="gap-8 pb-4">
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
                      <View className="h-14 w-14 overflow-hidden rounded-full border-2 border-primary/20 bg-zinc-800">
                        {avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            className="h-full w-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-full w-full items-center justify-center bg-primary/10">
                            <Text className="text-lg font-black text-primary">
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
