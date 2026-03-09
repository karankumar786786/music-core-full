"use client";

import ArtistList from "@/components/custom/AtistList";
import React from "react";
import { useAllArtistsStore } from "@/Store/AllArtistsStore";

function Page() {
  const artists = useAllArtistsStore((state) => state.artists);

  return (
    <div className="h-screen bg-black overflow-y-auto no-scrollbar">
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black text-white tracking-tighter">
            Top Artists
          </h1>
          <span className="text-zinc-500 font-medium">
            {artists.length} Results
          </span>
        </div>

        {/* List Layout (One artist per row) */}
        <div className="flex flex-col space-y-2">
          {artists.map((artist) => (
            <ArtistList
              key={artist.id}
              name={artist.artistName}
              bio={artist.bio || "Artist Bio"}
              coverImageUrl={artist.coverImageUrl}
              id={artist.id}
            />
          ))}
        </div>

        {/* Bottom Spacer */}
        <div className="h-32" />
      </div>
    </div>
  );
}

export default Page;
