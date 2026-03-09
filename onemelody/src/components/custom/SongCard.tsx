import { Song } from "@/types";
import { useCurrentlyPlayingSongsStore } from "@/Store/CurrentlyPlayingSongsStore";

export function SongCard({
  coverImageUrl,
  title,
  songBaseUrl,
  id,
}: {
  coverImageUrl: string;
  title: string;
  songBaseUrl: string;
  id: string;
}) {
  const setCurrentSong = useCurrentlyPlayingSongsStore(
    (state) => state.setCurrentSong,
  );
  const setIsPlaying = useCurrentlyPlayingSongsStore(
    (state) => state.setIsPlaying,
  );

  const loadSong = () => {
    const song: Song = {
      id,
      title,
      artist: "Single • 2024", // Placeholder for now
      coverImageUrl,
      songBaseUrl,
    };
    setCurrentSong(song);
    setIsPlaying(true);
  };

  return (
    <div className="w-40 group cursor-pointer flex flex-col" onClick={loadSong}>
      <div className="relative aspect-square overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300">
        <img
          src={coverImageUrl}
          alt={title}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
        />

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <svg
              className="w-6 h-6 text-white fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-3 px-1">
        <h3 className="text-white font-semibold text-sm truncate leading-tight">
          {title}
        </h3>
        <p className="text-zinc-400 text-xs mt-1 truncate">Single • 2024</p>
      </div>
    </div>
  );
}
