import '../global.css';

import { useEffect } from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { AuthProvider, useAuth } from '../lib/auth';
import { PlayerProvider } from '../lib/player-context';
import { StatusBar } from 'expo-status-bar';
import { setupOnlineManager, useAppStateFocusManager } from '../lib/query-setup';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Initialize online manager at module level
setupOnlineManager();

// Routes that authenticated users can access
const PROTECTED_ROUTES = ['(tabs)', 'artist', 'playlist', 'player', 'userplaylist', 'history'];

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useAppStateFocusManager();

  useEffect(() => {
    console.log(
      '[AuthGate] useEffect | isAuthenticated:',
      isAuthenticated,
      'isLoading:',
      isLoading,
      'segments:',
      segments
    );
    if (isLoading) return;

    const firstSegment = segments[0];
    const inProtectedRoute = PROTECTED_ROUTES.includes(firstSegment);
    console.log(
      '[AuthGate] Current route segment:',
      firstSegment,
      '| isProtected:',
      inProtectedRoute
    );

    if (isAuthenticated && !inProtectedRoute) {
      console.log('[AuthGate] Authenticated but in guest route, redirecting to home');
      router.replace('/(tabs)/home');
    } else if (!isAuthenticated && inProtectedRoute) {
      console.log('[AuthGate] Not authenticated and in protected route, redirecting to login');
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <LinearGradient colors={['#1a1a1a', '#050505']} className="absolute inset-0" />
        <View className="items-center">
          <View className="mb-8 h-32 w-32 items-center justify-center rounded-[40px] bg-white/[0.03] shadow-2xl shadow-primary/20">
            <Image
              source={require('../assets/logo.png')}
              className="h-24 w-24"
              resizeMode="contain"
            />
          </View>
          <Text className="text-4xl font-black tracking-tighter text-white">One Melody</Text>
          <View className="mt-8 flex-row items-center gap-2">
            <ActivityIndicator color="#08f808" size="small" />
            <Text className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
              Initializing...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="artist/[artistId]" options={{ animation: 'none' }} />
        <Stack.Screen name="playlist/[playlistId]" options={{ animation: 'none' }} />
        <Stack.Screen
          name="userplaylist/[userPlaylistId]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="history" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="lyrics"
          options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="player"
          options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PlayerProvider>
            <AuthGate />
          </PlayerProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
