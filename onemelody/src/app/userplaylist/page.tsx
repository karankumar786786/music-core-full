"use client";

import React from "react";
import { useAllUserPlaylistStore } from "@/Store/AllUserPlaylistStore";
import UserPlaylist from "@/components/custom/UserPlaylist";

function Page() {
  const userPlaylists = useAllUserPlaylistStore((state) => state.userPlaylists);

  return (
    <div className="h-screen bg-black overflow-y-auto no-scrollbar">
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">
          Your Playlists
        </h1>

        {/* List Container */}
        <div className="flex flex-col border-zinc-800">
          {userPlaylists.map((playlist) => (
            <UserPlaylist
              key={playlist.id}
              name={playlist.name}
              count={playlist.count}
              coverImageUrl={playlist.coverImageUrl}
              id={playlist.id}
            />
          ))}

          {/* Bottom padding so the last item isn't cut off */}
          <div className="h-24" />
        </div>
      </div>
    </div>
  );
}

export default Page;
