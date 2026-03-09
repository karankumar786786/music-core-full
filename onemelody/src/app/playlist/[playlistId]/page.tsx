"use client";

import SongHeader from "@/components/custom/SongList";
import SongItem from "@/components/custom/SongItem";
import React from "react";
import { Play, Shuffle } from "lucide-react";
import { useParams } from "next/navigation";
import { useAllPlaylistSongsStore } from "@/Store/PlaylistSongs";
import { useAllPlaylistStore } from "@/Store/AllPlaylistStore";
import { useCurrentlyPlayingSongsStore } from "@/Store/CurrentlyPlayingSongsStore";
import { useShallow } from "zustand/react/shallow";
import { useEffect } from "react";
import { listSongsByPlaylistId } from "@/app/server/listSongsByPlaylistId";

function Playlist() {
  const { playlistId } = useParams();
  const setPlaylistSongs = useAllPlaylistSongsStore(
    (state) => state.setPlaylistSongs,
  );
  const playlistSongs = useAllPlaylistSongsStore(
    useShallow((state) => state.playlistSongs[playlistId as string] || []),
  );
  const playlists = useAllPlaylistStore((state) => state.playlists);
  const playlist = playlists.find((p) => p.id === playlistId);
  const { setQueue, setCurrentSong, setIsPlaying } =
    useCurrentlyPlayingSongsStore();

  const handlePlay = () => {
    if (playlistSongs.length > 0) {
      setQueue(playlistSongs);
      setCurrentSong(playlistSongs[0]);
      setIsPlaying(true);
    }
  };

  const handleShuffle = () => {
    if (playlistSongs.length > 0) {
      const shuffledSongs = [...playlistSongs].sort(() => Math.random() - 0.5);
      setQueue(shuffledSongs);
      setCurrentSong(shuffledSongs[0]);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (playlistId) {
      const fetchSongs = async () => {
        const songsData = await listSongsByPlaylistId(Number(playlistId));
        const mappedSongs = songsData.map((song: any) => ({
          id: song.id.toString(),
          title: song.title,
          artist: song.artist_stage_name,
          coverImageUrl: song.coverImageUrl || "",
          songBaseUrl: song.songUrl || "",
          duration: song.duration?.toString(),
        }));
        setPlaylistSongs(playlistId as string, mappedSongs);
      };
      fetchSongs();
    }
  }, [playlistId, setPlaylistSongs]);

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Hero Header Section */}
      <div className="relative h-[40vh] w-full overflow-hidden group">
        <img
          src={
            playlist?.coverImageUrl ||
            "https://musicstreamingtemprory.s3.ap-south-1.amazonaws.com/1770968250600-Screenshot+2026-02-12+at+11.55.19%E2%80%AFPM.png"
          }
          alt="Playlist photo"
          className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />

        {/* Playlist Info Overlay */}
        <div className="absolute bottom-0 left-0 p-8 w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlay}
              className="bg-green-500 hover:bg-white text-black p-4 rounded-full transition-transform active:scale-95"
            >
              <Play fill="black" size={24} />
            </button>
            <button
              onClick={handleShuffle}
              className="border border-zinc-700 hover:border-white p-3 rounded-full transition-colors"
            >
              <Shuffle size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-8 py-8 bg-linear-to-b from-zinc-900/50 to-black">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-bold mb-4 text-zinc-300">
            {playlist?.name || "Playlist Name"}
          </h1>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl text-zinc-300 font-bold mb-6">
            Popular Tracks
          </h2>
          <div className="w-full select-none">
            <SongHeader />
            <div className="flex flex-col space-y-1">
              {playlistSongs.map((song, index) => (
                <SongItem
                  key={`${song.id}-${index}`}
                  song={song}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Playlist;
