"use client";
import { UserButton } from "@clerk/nextjs";
import { Search, X } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { searchSongs } from "@/app/server/searchSongs";
import { useCurrentlyPlayingSongsStore } from "@/Store/CurrentlyPlayingSongsStore";
import { Song } from "@/types";

function Navbar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const setCurrentSong = useCurrentlyPlayingSongsStore(
    (state) => state.setCurrentSong,
  );
  const setIsPlaying = useCurrentlyPlayingSongsStore(
    (state) => state.setIsPlaying,
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!val.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const songs = await searchSongs(val);
        setResults(songs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handlePlay = (songData: any) => {
    const song: Song = {
      id: songData.id,
      title: songData.title,
      artist: songData.artist_stage_name || "Unknown Artist",
      coverImageUrl: songData.coverImageUrl,
      songBaseUrl: songData.songUrl,
    };

    setCurrentSong(song);
    setIsPlaying(true);
    setResults([]);
    setQuery("");
  };

  return (
    <nav className="h-[10vh] flex items-center justify-between bg-black px-10 relative z-50">
      <div ref={containerRef} className="relative w-96">
        <div className="flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-4 py-2 w-full focus-within:bg-white/10 focus-within:border-white/20 transition-all">
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search songs, artists..."
            className="bg-transparent outline-none flex-1 text-sm text-white placeholder:text-zinc-500"
          />
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
          ) : query ? (
            <X
              className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-white"
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
            />
          ) : (
            <Search className="w-5 h-5 text-zinc-500" />
          )}
        </div>

        {/* Dropdown */}
        {results.length > 0 && (
          <div className="absolute top-full mt-2 left-0 w-full bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto z-100">
            {results.map((song) => (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition-colors"
              >
                <img
                  src={song.coverImageUrl}
                  className="w-10 h-10 rounded object-cover"
                  alt={song.title}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-white text-sm font-medium truncate">
                    {song.title}
                  </h4>
                  <p className="text-zinc-400 text-xs truncate">
                    {song.artist_stage_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <UserButton />
    </nav>
  );
}

export default Navbar;
