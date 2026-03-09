export interface Song {
    id: string;
    title: string;
    artist: string;
    coverImageUrl: string;
    songBaseUrl: string;
    duration?: string;
}

export interface Playlist {
    id: string;
    name: string;
    count: number;
    coverImageUrl: string;
}

export interface User {
    id: string;
    name: string;
    email?: string;
    imageUrl?: string;
}

export interface Artist {
    id: string;
    artistName: string;
    coverImageUrl: string;
    bio?: string;
}
