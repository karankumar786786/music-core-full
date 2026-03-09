import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000'

export const api = axios.create({
    baseURL: API_BASE_URL,
})

export const musicApi = {
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
}
