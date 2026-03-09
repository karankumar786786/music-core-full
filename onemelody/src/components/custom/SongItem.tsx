import { Play } from "lucide-react";
import { Song } from "@/types";
import { useCurrentlyPlayingSongsStore } from "@/Store/CurrentlyPlayingSongsStore";

interface SongItemProps {
  song: Song;
  index: number;
}

function SongItem({ song, index }: SongItemProps) {
  const setCurrentSong = useCurrentlyPlayingSongsStore(
    (state) => state.setCurrentSong,
  );
  const setIsPlaying = useCurrentlyPlayingSongsStore(
    (state) => state.setIsPlaying,
  );

  const loadSong = () => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  return (
    <div
      className="grid grid-cols-[16px_48px_1fr_80px] gap-4 px-4 py-2 rounded-md hover:bg-white/10 group transition-all cursor-pointer items-center"
      onClick={loadSong}
    >
      <div className="flex items-center justify-center text-zinc-500 text-sm">
        <span className="group-hover:hidden">{index + 1}</span>
        <Play
          className="hidden group-hover:block text-white fill-white"
          size={14}
        />
      </div>

      <div className="relative w-10 h-10">
        <img
          src={song.coverImageUrl}
          alt={song.title}
          className="rounded object-cover w-full h-full shadow-lg"
        />
      </div>

      <div className="flex flex-col min-w-0">
        <span className="text-white font-medium text-sm truncate group-hover:text-green-400 transition-colors">
          {song.title}
        </span>
        <span className="text-zinc-400 text-xs truncate">{song.artist}</span>
      </div>

      <div className="text-zinc-400 text-sm flex justify-end font-mono">
        {song.duration}
      </div>
    </div>
  );
}

export default SongItem;
