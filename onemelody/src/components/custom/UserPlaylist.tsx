import React from "react";
import { Play, Music } from "lucide-react";
import Link from "next/link";

interface PlaylistProps {
  name: string;
  count: number;
  updatedAt?: string;
  coverImageUrl: string;
  id: string;
}

function UserPlaylist({
  name,
  count,
  coverImageUrl,
  updatedAt = "2 days ago",
  id,
}: PlaylistProps) {
  return (
    // Increased padding from p-3 to p-5 for a larger footprint
    <Link href={`/userplaylist/${id}`}>
      <div className="group flex items-center justify-between p-5 rounded-xl hover:bg-zinc-800/50 transition-all duration-200 cursor-pointer border-b border-zinc-900/50">
        {/* Left Section: Image and Name */}
        <div className="flex items-center gap-6 flex-1">
          {/* Playlist Image: Increased from 14 (56px) to 20 (80px) ~ approx 30%+ increase */}
          <div className="relative h-20 w-20 shrink-0 shadow-xl bg-zinc-800 rounded-lg overflow-hidden">
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <Music className="w-10 h-10 text-zinc-600" />
              </div>
            )}
            {/* Larger Overlay Play Icon */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <Play fill="white" size={24} className="text-white" />
            </div>
          </div>

          {/* Playlist Info */}
          <div className="flex flex-col min-w-0 space-y-1">
            {/* Increased font from text-sm to text-lg */}
            <h3 className="text-white font-bold text-lg truncate group-hover:text-green-400 transition-colors">
              {name}
            </h3>
            {/* Increased font from text-xs to text-sm */}
            <p className="text-zinc-500 text-sm font-medium">{count} Tracks</p>
          </div>
        </div>

        {/* Right Section: Updated Date */}
        <div className="text-right shrink-0 ml-4">
          <p className="text-zinc-500 text-sm font-medium group-hover:text-zinc-300 transition-colors">
            Updated {updatedAt}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default UserPlaylist;
