"use client";

import { useAllSongsStore } from "@/Store/AllSongsStore";
import { useAllPlaylistStore } from "@/Store/AllPlaylistStore";
import { useAllArtistsStore } from "@/Store/AllArtistsStore";
import { ArtistCard } from "@/components/custom/ArtistCard";
import { HeroCard } from "@/components/custom/HeroCard";
import { PlaylistCard } from "@/components/custom/PlaylistCard";
import { SongCard } from "@/components/custom/SongCard";

export default function Home() {
  const songs = useAllSongsStore((state) => state.songs);
  const playlists = useAllPlaylistStore((state) => state.playlists);
  const artists = useAllArtistsStore((state) => state.artists);

  return (
    <div className="p-4 space-y-6 bg-black">
      {/* Hero Section */}
      <div className="flex flex-col justify-center items-center">
        <HeroCard
          items={songs.slice(0, 3)} // Use first 3 songs for hero for now
        />
      </div>

      {/* Artists Section */}
      <div className="space-y-4">
        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 p-1">
          {artists.map((artist) => (
            <ArtistCard
              key={artist.id}
              coverImageUrl={artist.coverImageUrl}
              id={artist.id}
              artistName={artist.artistName}
            />
          ))}
        </div>
      </div>

      {/* Playlist Section */}
      <div className="space-y-3">
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
          {playlists.map((playlist) => (
            <div key={playlist.id}>
              <PlaylistCard
                id={playlist.id}
                coverImageUrl={playlist.coverImageUrl}
                name={playlist.name}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Songs Grid Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold px-1 tracking-tight text-white">
          Suggested Songs
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 no-scrollbar lg:grid-cols-4 xl:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {songs.map((song) => (
            <div key={song.id} className="flex justify-center">
              <SongCard
                coverImageUrl={song.coverImageUrl}
                songBaseUrl={song.songBaseUrl}
                id={song.id}
                title={song.title}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
