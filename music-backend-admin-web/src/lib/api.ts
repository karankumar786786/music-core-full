import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000'

export const api = axios.create({
    baseURL: API_BASE_URL,
})

export const adminApi = {
    // Songs
    getSongs: async () => (await api.get('/songs')).data,
    getSongsJobs: async () => (await api.get('/songs/jobs')).data,
    createSong: async (data: any) => (await api.post('/songs', data)).data,
    deleteSong: async (id: string) => (await api.delete(`/songs/${id}`)).data,

    // Artists
    getArtists: async () => (await api.get('/artists')).data,
    getArtist: async (id: string) => (await api.get(`/artists/${id}`)).data,
    createArtist: async (data: any) => (await api.post('/artists', data)).data,
    deleteArtist: async (id: string) => (await api.delete(`/artists/${id}`)).data,
    getArtistSongs: async (id: string) => (await api.get(`/artists/${id}/songs`)).data,

    // Playlists
    getPlaylists: async () => (await api.get('/playlists')).data,
    getPlaylist: async (id: string) => (await api.get(`/playlists/${id}`)).data,
    createPlaylist: async (data: any) => (await api.post('/playlists', data)).data,
    deletePlaylist: async (id: string) => (await api.delete(`/playlists/${id}`)).data,
    addSongToPlaylist: async (playlistId: string, songId: string) =>
        (await api.post(`/playlists/${playlistId}/songs`, { songId })).data,
    removeSongFromPlaylist: async (playlistId: string, songId: string) =>
        (await api.delete(`/playlists/${playlistId}/songs/${songId}`)).data,

    // Storage
    getPresignedUrl: async (fileName: string, contentType: string) =>
        (await api.get('/storage/presigned-url', { params: { fileName, contentType } })).data,

    // Search
    // Search
    globalSearch: async (q: string) => (await api.get('/search', { params: { q } })).data,
}
