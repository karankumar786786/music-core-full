import { Play, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FavoriteButton,
  PlaylistButton,
} from "@/components/custom/SongActions";
import { getCoverImageUrl } from "@/lib/s3";
import { playerActions } from "@/Store/playerStore";
import { mapToPlayerSong } from "@/lib/player-utils";
import { capitalize } from "@/lib/utils";

interface SongRowProps {
  song: any;
  index: number;
  showFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function SongRow({ song, index, showFavorite = true, onToggleFavorite }: SongRowProps) {
  return (
    <div
      className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all duration-300 cursor-pointer border border-transparent hover:border-white/5 active:scale-[0.98]"
      onClick={() => {
        playerActions.playSong(mapToPlayerSong(song));
      }}
    >
      <div className="w-8 text-center text-zinc-600 font-black text-[10px] group-hover:text-primary transition-colors font-mono">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/5 shadow-lg group-hover:border-primary/20 transition-colors">
        {song.storageKey || song.coverUrl ? (
          <img
            src={
              song.coverUrl ||
              getCoverImageUrl(song.storageKey, "small", true) ||
              ""
            }
            alt={song.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <ListMusic className="h-6 w-6 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
          <Play className="h-5 w-5 fill-current text-white transform scale-90 group-hover:scale-100 transition-transform" />
        </div>
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors text-sm tracking-tight">
          {capitalize(song.title)}
        </h3>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">
          {capitalize(song.artistName)}
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
        {showFavorite && (
          <FavoriteButton songId={song.id} isLiked={song.isLiked || false} onToggle={onToggleFavorite} />
        )}
        <PlaylistButton songId={song.id} />
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-zinc-400 hover:text-primary hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20 shadow-2xl"
          onClick={(e) => {
            e.stopPropagation();
            playerActions.playSong(mapToPlayerSong(song));
          }}
        >
          <Play className="h-5 w-5 fill-current" />
        </Button>
      </div>
    </div>
  );
}
