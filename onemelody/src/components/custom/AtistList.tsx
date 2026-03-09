import React from "react";
import Link from "next/link";

function ArtistList({
  name,
  bio,
  coverImageUrl,
  id,
}: {
  name: string;
  bio: string;
  coverImageUrl: string;
  id: string;
}) {
  return (
    <Link href={`/artist/${id}`}>
      <div className="flex items-center gap-6 p-4 rounded-xl hover:bg-white/5 transition-all group cursor-pointer border border-transparent hover:border-zinc-800">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full shadow-2xl ring-2 ring-zinc-900 group-hover:ring-zinc-700 transition-all">
          <img
            src={coverImageUrl}
            alt={name}
            className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
          />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white tracking-tight group-hover:text-green-400 transition-colors">
              {name}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              Artist
            </span>
          </div>
          <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed max-w-2xl font-medium opacity-80 group-hover:opacity-100">
            {bio}
          </p>
        </div>

        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-500 hover:text-white">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default ArtistList;
