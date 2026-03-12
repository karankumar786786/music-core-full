import React, { useEffect, useRef, useState } from 'react';
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
  ScrollView,
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

// ─── VTT Parser ──────────────────────────────────────────────────────────────

interface LyricCue {
  start: number; // seconds
  end: number;
  text: string;
}

function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(':');
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return 0;
}

function parseVTT(vttText: string): LyricCue[] {
  if (!vttText.trim().startsWith('WEBVTT')) return [];
  const lines = vttText.split('\n');
  const cues: LyricCue[] = [];
  let tempCue: Partial<LyricCue> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === 'WEBVTT') continue;

    if (line.includes('-->')) {
      const [start, end] = line.split('-->').map((t) => t.trim());
      tempCue = { start: parseTimestamp(start), end: parseTimestamp(end), text: '' };
    } else if (tempCue && line) {
      tempCue.text = (tempCue.text ? tempCue.text + ' ' : '') + line;
      const nextLine = lines[i + 1]?.trim();
      if (!nextLine || nextLine.includes('-->') || i + 1 === lines.length) {
        cues.push(tempCue as LyricCue);
        tempCue = null;
      }
    }
  }
  return cues;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PlayerScreen() {
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const queryClient = useQueryClient();

  const {
    currentSong,
    isPlaying,
    isBuffering,
    duration,
    position,
    baseUrl,
    togglePlayPause,
    seekTo,
  } = usePlayer();

  // ── Lyrics state ──
  const [lyrics, setLyrics] = useState<LyricCue[]>([]);
  const [activeCueIndex, setActiveCueIndex] = useState(-1);
  const lyricsScrollRef = useRef<ScrollView>(null);
  const cueRefs = useRef<Record<number, number>>({}); // y positions

  // ── Misc ──
  const [isLiked, setIsLiked] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  // ── Load VTT lyrics ──
  useEffect(() => {
    if (!baseUrl) return;
    const captionUrl = `${baseUrl}/caption.vtt`;

    fetch(captionUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => setLyrics(parseVTT(text)))
      .catch(() => setLyrics([]));
  }, [baseUrl]);

  // ── Sync active lyric on position change ──
  useEffect(() => {
    if (lyrics.length === 0) return;
    let found = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (position >= lyrics[i].start && position <= lyrics[i].end) {
        found = i;
        break;
      }
    }
    if (found !== activeCueIndex) {
      setActiveCueIndex(found);
      if (found !== -1 && cueRefs.current[found] !== undefined && lyricsScrollRef.current) {
        lyricsScrollRef.current.scrollTo({
          y: Math.max(0, cueRefs.current[found] - 120),
          animated: true,
        });
      }
    }
  }, [position, lyrics]);

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
  const ART_SIZE = SCREEN_WIDTH - 64;
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

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80">
          <Ionicons name="chevron-down" size={22} color="#a1a1aa" />
        </Pressable>
        <Text className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Now Playing
        </Text>
        <Pressable
          onPress={() => setShowPlaylistModal(true)}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80">
          <Ionicons name="add" size={22} color="#22c55e" />
        </Pressable>
      </View>

      {/* ── Album Art ── */}
      <View className="items-center px-8 pb-4">
        <View
          style={{ width: ART_SIZE, height: ART_SIZE * 0.55, borderRadius: 20 }}
          className="overflow-hidden border border-white/10 bg-zinc-900">
          {coverImage ? (
            <Image
              source={{ uri: coverImage }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-green-500/5">
              <Ionicons name="musical-notes" size={60} color="#22c55e" />
            </View>
          )}
          {isBuffering && (
            <View className="absolute inset-0 items-center justify-center bg-black/40">
              <ActivityIndicator color="#22c55e" size="large" />
            </View>
          )}
        </View>
      </View>

      {/* ── Lyrics ── */}
      <View style={{ height: 160 }} className="mb-2">
        <ScrollView
          ref={lyricsScrollRef}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingVertical: 40, paddingHorizontal: 24 }}
          style={{ flex: 1 }}>
          {lyrics.length > 0 ? (
            lyrics.map((cue, index) => {
              const isActive = index === activeCueIndex;
              const isPast = index < activeCueIndex;
              return (
                <Pressable
                  key={index}
                  onPress={() => seekTo(cue.start)}
                  onLayout={(e) => {
                    cueRefs.current[index] = e.nativeEvent.layout.y;
                  }}
                  style={{ marginBottom: 24 }}>
                  <Text
                    style={{
                      fontSize: isActive ? 22 : 18,
                      fontWeight: '800',
                      color: isActive ? '#ffffff' : isPast ? '#3f3f46' : '#52525b',
                      textAlign: 'center',
                      opacity: isActive ? 1 : isPast ? 0.4 : 0.5,
                      lineHeight: isActive ? 30 : 26,
                    }}>
                    {cue.text}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <View className="items-center justify-center py-8">
              <Ionicons name="musical-note" size={24} color="#27272a" />
              <Text className="mt-2 text-xs text-zinc-700">Ready to stream</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── Song Info + Controls ── */}
      <View className="flex-1 justify-between px-8 pb-6">
        <View className="flex-row items-center justify-between">
          <View className="mr-4 flex-1">
            <Text className="text-xl font-black tracking-tight text-white" numberOfLines={1}>
              {capitalize(currentSong.title || '')}
            </Text>
            <Text className="mt-0.5 text-sm font-semibold text-zinc-400" numberOfLines={1}>
              {capitalize(currentSong.artistName || '')}
            </Text>
          </View>
          <Pressable
            onPress={() => favMutation.mutate()}
            disabled={favMutation.isPending}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-zinc-900/80">
            {favMutation.isPending ? (
              <ActivityIndicator color="#22c55e" size="small" />
            ) : (
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? '#ef4444' : '#a1a1aa'}
              />
            )}
          </Pressable>
        </View>

        <View>
          <Pressable
            onPress={(e) => {
              const x = e.nativeEvent.locationX;
              const barWidth = SCREEN_WIDTH - 64;
              const ratio = Math.max(0, Math.min(1, x / barWidth));
              seekTo(ratio * duration);
            }}
            className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <View
              className="h-full rounded-full bg-green-500"
              style={{ width: `${progress * 100}%` }}
            />
          </Pressable>
          <View className="mt-1.5 flex-row justify-between">
            <Text className="text-xs font-bold text-zinc-500">{formatTime(position)}</Text>
            <Text className="text-xs font-bold text-zinc-500">{formatTime(duration)}</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-2">
          <View
            className="h-1.5 w-1.5 rounded-full bg-green-500"
            style={{ shadowColor: '#22c55e', shadowOpacity: 0.8, shadowRadius: 4 }}
          />
          <Text className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            HLS Streaming Active
          </Text>
        </View>

        <View className="flex-row items-center justify-center gap-6">
          <Pressable className="h-12 w-12 items-center justify-center rounded-full active:bg-white/5">
            <Ionicons name="shuffle" size={22} color="#71717a" />
          </Pressable>
          <Pressable className="h-14 w-14 items-center justify-center rounded-full active:bg-white/5">
            <Ionicons name="play-skip-back" size={26} color="#fff" />
          </Pressable>
          <Pressable
            onPress={togglePlayPause}
            className="h-20 w-20 items-center justify-center rounded-full bg-white active:opacity-80">
            {isBuffering ? (
              <ActivityIndicator color="#000" size="large" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={34}
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
