import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { usePlayer } from '../lib/player-context';
import { capitalize } from '../lib/utils';
import { parseVTT, LyricCue } from '../lib/lyrics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LyricsScreen() {
  const insets = useSafeAreaInsets();
  const {
    currentSong,
    isPlaying,
    isBuffering,
    duration,
    position,
    bufferedPosition,
    baseUrl,
    togglePlayPause,
    seekTo,
    activeTrack,
  } = usePlayer();

  const [lyrics, setLyrics] = useState<LyricCue[]>([]);
  const [activeCueIndex, setActiveCueIndex] = useState(-1);
  const lyricsScrollRef = useRef<ScrollView>(null);
  const cueRefs = useRef<Record<number, number>>({});

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
          y: Math.max(0, cueRefs.current[found] - SCREEN_WIDTH * 0.4),
          animated: true,
        });
      }
    }
  }, [position, lyrics]);

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  if (!currentSong) {
    return (
      <View
        className="flex-1 items-center justify-center bg-black"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <StatusBar style="light" />
        <Ionicons name="musical-notes" size={48} color="#27272a" />
        <Text className="mt-4 font-bold text-zinc-500">No song playing</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-8 rounded-full border border-white/10 bg-zinc-900 px-8 py-3">
          <Text className="font-bold text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-black"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar style="light" />
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-6 pb-6 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80">
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </Pressable>
        <View className="flex-1 items-center px-4">
          <Text className="text-base font-black tracking-tight text-white" numberOfLines={1}>
            {capitalize(currentSong.title)}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Text className="text-xs font-bold text-zinc-500" numberOfLines={1}>
              {capitalize(currentSong.artistName)}
            </Text>
            {activeTrack && (
              <View className="rounded-full border border-green-500/20 bg-green-500/10 px-1.5 py-0.5">
                <Text className="text-[9px] font-black text-green-500">
                  {activeTrack.size.height}p
                </Text>
              </View>
            )}
          </View>
        </View>
        <View className="w-11" />
      </View>

      {/* ── Immersive Lyrics ── */}
      <ScrollView
        ref={lyricsScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 100, paddingHorizontal: 32 }}
        className="flex-1">
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
                className="mb-8">
                <Text
                  style={{
                    fontSize: isActive ? 32 : 24,
                    fontWeight: '900',
                    color: isActive ? '#fff' : isPast ? '#3f3f46' : '#52525b',
                    opacity: isActive ? 1 : isPast ? 0.3 : 0.5,
                    lineHeight: isActive ? 42 : 34,
                  }}>
                  {cue.text}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <View className="items-center justify-center py-20">
            <ActivityIndicator color="#22c55e" size="large" />
            <Text className="mt-4 text-sm font-bold text-zinc-600">Loading lyrics...</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Minimal Player Controls ── */}
      <View className="px-8 pb-8 pt-4">
        {/* Progress Bar */}
        <View className="mb-6">
          <Pressable
            onPress={(e) => {
              const x = e.nativeEvent.locationX;
              const barWidth = SCREEN_WIDTH - 64;
              const ratio = Math.max(0, Math.min(1, x / barWidth));
              seekTo(ratio * duration);
            }}
            className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <View
              className="absolute h-full bg-white/90"
              style={{ width: `${duration > 0 ? (bufferedPosition / duration) * 100 : 0}%` }}
            />
            <View
              className="h-full rounded-full bg-green-500"
              style={{ width: `${progress * 100}%` }}
            />
          </Pressable>
          <View className="mt-2 flex-row justify-between">
            <Text className="text-[10px] font-black text-zinc-500">{formatTime(position)}</Text>
            <Text className="text-[10px] font-black text-zinc-500">{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View className="flex-row items-center justify-center gap-10">
          <Pressable className="h-12 w-12 items-center justify-center rounded-full active:bg-white/5">
            <Ionicons name="play-skip-back" size={28} color="#fff" />
          </Pressable>
          <Pressable
            onPress={togglePlayPause}
            className="h-16 w-16 items-center justify-center rounded-full bg-white active:opacity-80">
            {isBuffering ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="#000"
                style={!isPlaying ? { marginLeft: 4 } : undefined}
              />
            )}
          </Pressable>
          <Pressable className="h-12 w-12 items-center justify-center rounded-full active:bg-white/5">
            <Ionicons name="play-skip-forward" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
