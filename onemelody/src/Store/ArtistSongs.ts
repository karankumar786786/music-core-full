import { create } from 'zustand';
import { Song } from '@/types';

interface ArtistSongsState {
    artistSongs: Record<string, Song[]>; // artistId -> Song[]
    setArtistSongs: (artistId: string, songs: Song[]) => void;
    addSongToArtist: (artistId: string, song: Song) => void;
}

export const useArtistSongsStore = create<ArtistSongsState>((set) => ({
    artistSongs: {},
    setArtistSongs: (artistId, songs) =>
        set((state) => ({
            artistSongs: { ...state.artistSongs, [artistId]: songs }
        })),
    addSongToArtist: (artistId, song) =>
        set((state) => ({
            artistSongs: {
                ...state.artistSongs,
                [artistId]: [...(state.artistSongs[artistId] || []), song]
            }
        })),
}));
