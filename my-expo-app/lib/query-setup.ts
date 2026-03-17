import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

/**
 * Online Manager – uses expo-network to track connectivity.
 * This keeps TanStack Query aware of network state (pauses queries when offline).
 */
export function setupOnlineManager() {
    onlineManager.setEventListener((setOnline) => {
        let initialised = false;

        const eventSubscription = Network.addNetworkStateListener((state) => {
            initialised = true;
            setOnline(!!state.isConnected);
        });

        Network.getNetworkStateAsync()
            .then((state) => {
                if (!initialised) {
                    setOnline(!!state.isConnected);
                }
            })
            .catch(() => {
                // getNetworkStateAsync can reject on some platforms/SDK versions
            });

        return eventSubscription.remove;
    });
}

/**
 * Focus Manager – refetch stale queries when app comes back to foreground.
 */
function onAppStateChange(status: AppStateStatus) {
    if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
    }
}

export function useAppStateFocusManager() {
    useEffect(() => {
        const subscription = AppState.addEventListener('change', onAppStateChange);
        return () => subscription.remove();
    }, []);
}
