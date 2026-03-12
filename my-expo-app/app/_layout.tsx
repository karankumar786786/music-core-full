import '../global.css';

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { AuthProvider, useAuth } from '../lib/auth';
import { PlayerProvider } from '../lib/player-context';
import { StatusBar } from 'expo-status-bar';
import { setupOnlineManager, useAppStateFocusManager } from '../lib/query-setup';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Initialize online manager at module level
setupOnlineManager();

// Routes that authenticated users can access
const PROTECTED_ROUTES = [
  '(tabs)',
  'artist',
  'playlist',
  'search',
  'player',
  'userplaylist',
  'history',
];

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useAppStateFocusManager();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0];
    const inProtectedRoute = PROTECTED_ROUTES.includes(firstSegment);

    if (isAuthenticated && !inProtectedRoute) {
      router.replace('/(tabs)/home');
    } else if (!isAuthenticated && inProtectedRoute) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading]);

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
        <Stack.Screen name="search/index" options={{ animation: 'none' }} />
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
