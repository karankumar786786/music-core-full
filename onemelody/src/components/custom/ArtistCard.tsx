import Link from "next/link";

export function ArtistCard({
  coverImageUrl,
  artistName,
  id,
}: {
  coverImageUrl: string;
  artistName: string;
  id: string;
}) {
  return (
    <div className="shrink-0 group cursor-pointer flex flex-col items-center w-24 sm:w-32">
      <Link href={`artist/${id}`}>
        <div className="relative w-full aspect-square overflow-hidden rounded-full shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:ring-2 ring-zinc-700 bg-zinc-800">
          <img
            src={coverImageUrl}
            alt={artistName}
            className="h-full w-full object-cover object-center transform group-hover:scale-110 transition-transform duration-500"
          />

          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="mt-3 text-center w-full px-2">
          <p className="text-white font-medium text-xs sm:text-sm truncate">
            {artistName}
          </p>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">
            Artist
          </p>
        </div>
      </Link>
    </div>
  );
}
