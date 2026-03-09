"use client";

import SongHeader from "@/components/custom/SongList";
import SongItem from "@/components/custom/SongItem";
import React from "react";
import { useUserHistorySongsStore } from "@/Store/UserHistorySongsStore";

function Page() {
  const songs = useUserHistorySongsStore((state) => state.historySongs);

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Content Section */}
      <div className="px-8 py-8 ">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-bold mb-4 text-zinc-300">History</h1>
        </div>

        <div className="mt-12">
          <div className="w-full select-none">
            <SongHeader />
            <div className="flex flex-col space-y-1">
              {songs.map((song, index) => (
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

export default Page;
