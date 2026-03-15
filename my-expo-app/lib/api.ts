import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

let cachedToken: string | null = null;

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
});

// Request interceptor – attach JWT from SecureStore
api.interceptors.request.use(
    async (config) => {
        if (!cachedToken) {
            cachedToken = await SecureStore.getItemAsync('access_token');
        }
        if (cachedToken) {
            config.headers.Authorization = `Bearer ${cachedToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            cachedToken = null;
            await SecureStore.deleteItemAsync('access_token');
        }
        return Promise.reject(error);
    }
);

export const musicApi = {
    // ── Auth ──
    login: async (credentials: { email: string; password: string }) => {
        const response = await api.post('/auth/login', credentials);
        if (response.data.access_token) {
            cachedToken = response.data.access_token;
            await SecureStore.setItemAsync('access_token', response.data.access_token);
        }
        return response.data;
    },

    register: async (data: { email: string; password: string; name: string }) => {
        const response = await api.post('/auth/register', data);
        if (response.data.access_token) {
            cachedToken = response.data.access_token;
            await SecureStore.setItemAsync('access_token', response.data.access_token);
        }
        return response.data;
    },

    logout: async () => {
        cachedToken = null;
        await SecureStore.deleteItemAsync('access_token');
    },

    getMe: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get('/users/me');
        return response.data;
    },

    updateProfile: async (data: { name?: string; profilePictureKey?: string }) => {
        const response = await api.patch('/users/me', data);
        return response.data;
    },

    changePassword: async (data: { oldPassword?: string; newPassword?: string }) => {
        const response = await api.patch('/users/me/password', data);
        return response.data;
    },

    // ── Feed & Content ──
    getFeed: async (excludeIds: string[] = []) => {
        const params = excludeIds.length > 0 ? `?exclude=${excludeIds.join(',')}` : '';
        const response = await api.get(`/feed${params}`);
        return response.data;
    },

    getTrending: async () => {
        const response = await api.get('/interaction/trending');
        return response.data;
    },

    getFeatured: async () => {
        const response = await api.get('/interaction/featured');
        return response.data;
    },

    search: async (query: string) => {
        const response = await api.get(`/search?q=${query}`);
        return response.data;
    },

    getArtists: async (page = 1, limit = 20) => {
        const response = await api.get(`/artists?page=${page}&limit=${limit}`);
        return response.data;
    },

    getArtist: async (id: string) => {
        const response = await api.get(`/artists/${id}`);
        return response.data;
    },

    getArtistSongs: async (id: string, page = 1, limit = 50) => {
        const response = await api.get(`/artists/${id}/songs?page=${page}&limit=${limit}`);
        return response.data;
    },

    getPlaylists: async (page = 1, limit = 20) => {
        const response = await api.get(`/playlists?page=${page}&limit=${limit}`);
        return response.data;
    },

    getPlaylist: async (id: string, page = 1, limit = 20) => {
        const response = await api.get(`/playlists/${id}?page=${page}&limit=${limit}`);
        return response.data;
    },

    getSongs: async (page = 1, limit = 20) => {
        const response = await api.get(`/songs?page=${page}&limit=${limit}`);
        return response.data;
    },

    getFavourites: async (page = 1, limit = 50) => {
        const response = await api.get(`/interaction/favourites?page=${page}&limit=${limit}`);
        return response.data;
    },

    addFavourite: async (songId: string) => {
        const response = await api.post('/interaction/favourites', { songId });
        return response.data;
    },

    removeFavourite: async (songId: string) => {
        const response = await api.delete(`/interaction/favourites/${songId}`);
        return response.data;
    },
    checkFavourite: async (songId: string) => {
        const response = await api.get(`/interaction/favourites/check/${songId}`);
        return response.data;
    },

    getHistory: async (page = 1, limit = 50) => {
        const response = await api.get(`/interaction/history?page=${page}&limit=${limit}`);
        return response.data;
    },

    getUserPlaylists: async (page = 1, limit = 20) => {
        const response = await api.get(`/userplaylists?page=${page}&limit=${limit}`);
        return response.data;
    },

    getUserPlaylist: async (id: string, page = 1, limit = 50) => {
        const response = await api.get(`/userplaylists/${id}?page=${page}&limit=${limit}`);
        return response.data;
    },

    createUserPlaylist: async (data: { title: string }) => {
        const response = await api.post('/userplaylists', data);
        return response.data;
    },

    deleteUserPlaylist: async (id: string) => {
        const response = await api.delete(`/userplaylists/${id}`);
        return response.data;
    },

    addSongToUserPlaylist: async (playlistId: string, songId: string) => {
        const response = await api.post(`/userplaylists/${playlistId}/songs`, { songId });
        return response.data;
    },

    removeSongFromUserPlaylist: async (playlistId: string, songId: string) => {
        const response = await api.delete(`/userplaylists/${playlistId}/songs/${songId}`);
        return response.data;
    },

    addView: async (songId: string) => {
        const response = await api.post('/interaction/views', { songId });
        return response.data;
    },

    getProfilePictureUploadUrl: async (fileName: string, contentType: string) => {
        const response = await api.get('/users/me/profile-picture-upload-url', {
            params: { fileName, contentType },
        });
        return response.data;
    },

    addSearchHistory: async (data: { searchString: string }) => {
        const response = await api.post('/interaction/search-history', data);
        return response.data;
    },

    getSearchHistory: async () => {
        const response = await api.get('/interaction/search-history');
        return response.data;
    },

    clearSearchHistory: async () => {
        const response = await api.delete('/interaction/search-history');
        return response.data;
    },
};
