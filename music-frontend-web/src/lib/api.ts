import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000'

export const api = axios.create({
    baseURL: API_BASE_URL,
})

// Add a request interceptor to include the JWT token in all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
}, (error) => {
    return Promise.reject(error)
})

export const musicApi = {
    // Auth
    login: async (credentials: any) => {
        const response = await api.post('/auth/login', credentials)
        if (response.data.access_token) {
            localStorage.setItem('access_token', response.data.access_token)
        }
        return response.data
    },
    register: async (data: any) => {
        const response = await api.post('/auth/register', data)
        if (response.data.access_token) {
            localStorage.setItem('access_token', response.data.access_token)
        }
        return response.data
    },
    logout: () => {
        localStorage.removeItem('access_token')
    },
    getMe: async () => {
        const response = await api.get('/auth/me')
        return response.data
    },

    // Feed & Content
    getFeed: async () => {
        const response = await api.get('/feed')
        return response.data
    },
    getTrending: async () => {
        const response = await api.get('/interaction/trending')
        return response.data
    },
    getFeatured: async () => {
        const response = await api.get('/interaction/featured')
        return response.data
    },
    search: async (query: string) => {
        const response = await api.get(`/search?q=${query}`)
        return response.data
    },
    getArtists: async (page = 1, limit = 20) => {
        const response = await api.get(`/artists?page=${page}&limit=${limit}`)
        return response.data
    },
    getArtist: async (id: string) => {
        const response = await api.get(`/artists/${id}`)
        return response.data
    },
    getArtistSongs: async (id: string, page = 1, limit = 50) => {
        const response = await api.get(`/artists/${id}/songs?page=${page}&limit=${limit}`)
        return response.data
    },
    getPlaylists: async (page = 1, limit = 20) => {
        const response = await api.get(`/playlists?page=${page}&limit=${limit}`)
        return response.data
    },
    getPlaylist: async (id: string) => {
        const response = await api.get(`/playlists/${id}`)
        return response.data
    },
    getSongs: async (page = 1, limit = 20) => {
        const response = await api.get(`/songs?page=${page}&limit=${limit}`)
        return response.data
    },
    getFavourites: async (page = 1, limit = 50) => {
        const response = await api.get(`/interaction/favourites?page=${page}&limit=${limit}`)
        return response.data
    },
    addFavourite: async (songId: string) => {
        const response = await api.post('/interaction/favourites', { songId })
        return response.data
    },
    removeFavourite: async (songId: string) => {
        const response = await api.delete(`/interaction/favourites/${songId}`)
        return response.data
    },
    getHistory: async (page = 1, limit = 50) => {
        const response = await api.get(`/interaction/history?page=${page}&limit=${limit}`)
        return response.data
    },
    addSearchHistory: async (data: { searchString: string }) => {
        const response = await api.post('/interaction/search-history', data)
        return response.data
    },
    getUserPlaylists: async (page = 1, limit = 20) => {
        const response = await api.get(`/userplaylists?page=${page}&limit=${limit}`)
        return response.data
    },
    getUserPlaylist: async (id: string, page = 1, limit = 50) => {
        const response = await api.get(`/userplaylists/${id}?page=${page}&limit=${limit}`)
        return response.data
    },
    createUserPlaylist: async (data: { title: string }) => {
        const response = await api.post('/userplaylists', data)
        return response.data
    },
    addSongToUserPlaylist: async (playlistId: string, songId: string) => {
        const response = await api.post(`/userplaylists/${playlistId}/songs`, { songId })
        return response.data
    },
    removeSongFromUserPlaylist: async (playlistId: string, songId: string) => {
        const response = await api.delete(`/userplaylists/${playlistId}/songs/${songId}`)
        return response.data
    },
    addView: async (songId: string) => {
        const response = await api.post('/interaction/views', { songId })
        return response.data
    }
}
