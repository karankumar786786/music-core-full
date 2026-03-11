import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { musicApi } from './api';

interface User {
    id: string;
    email: string;
    name: string;
    profilePictureKey?: string;
    profilePictureUrl?: string;
    createdAt?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: { email: string; password: string }) => Promise<any>;
    register: (data: { email: string; password: string; name: string }) => Promise<any>;
    logout: () => Promise<void>;
    refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
    refetch: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                setUser(null);
                setIsLoading(false);
                return;
            }
            const data = await musicApi.getMe();
            setUser(data);
        } catch {
            setUser(null);
            await SecureStore.deleteItemAsync('access_token');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const login = useCallback(async (credentials: { email: string; password: string }) => {
        const data = await musicApi.login(credentials);
        if (data.user) setUser(data.user);
        else await fetchUser();
        return data;
    }, [fetchUser]);

    const register = useCallback(async (regData: { email: string; password: string; name: string }) => {
        const data = await musicApi.register(regData);
        if (data.user) setUser(data.user);
        else await fetchUser();
        return data;
    }, [fetchUser]);

    const logout = useCallback(async () => {
        await musicApi.logout();
        setUser(null);
    }, []);

    const value = React.useMemo(
        () => ({
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            register,
            logout,
            refetch: fetchUser,
        }),
        [user, isLoading, login, register, logout, fetchUser],
    );

    return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
    return useContext(AuthContext);
}
