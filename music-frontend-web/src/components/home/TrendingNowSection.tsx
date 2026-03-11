import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play } from "lucide-react";
import { getCoverImageUrl } from "@/lib/s3";
import { playerActions } from "@/Store/playerStore";
import { mapToPlayerSong } from "@/lib/player-utils";
import { capitalize } from "@/lib/utils";

interface TrendingNowSectionProps {
  trendingData: any;
  trendingLoading: boolean;
}

export function TrendingNowSection({
  trendingData,
  trendingLoading,
}: TrendingNowSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Trending Now
        </h2>
      </div>
      <div className="flex flex-row overflow-x-auto gap-6 pb-4 no-scrollbar">
        {trendingLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-none w-[180px] space-y-4">
                <Skeleton className="aspect-4/3 w-full rounded-3xl bg-zinc-900/50" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-zinc-900/50" />
                  <Skeleton className="h-3 w-1/2 bg-zinc-900/50" />
                </div>
              </div>
            ))
          : trendingData?.data?.map((song: any) => (
              <div
                key={song.id}
                className="flex-none w-[200px] group relative space-y-4 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  playerActions.playSong(mapToPlayerSong(song));
                }}
              >
                <div className="relative aspect-4/3 overflow-hidden rounded-3xl bg-zinc-900 border border-white/5 shadow-xl">
                  {song.storageKey ? (
                    <img
                      src={
                        song.coverUrl ||
                        getCoverImageUrl(song.storageKey, "medium", true) ||
                        ""
                      }
                      alt={song.title}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                      <Play className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <Button
                      size="icon"
                      className="h-14 w-14 rounded-full bg-primary hover:scale-110 active:scale-90 transition-all shadow-2xl shadow-primary/40"
                    >
                      <Play className="h-7 w-7 fill-current text-white" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors text-base tracking-tight">
                    {capitalize(song.title)}
                  </h3>
                  <p className="text-xs text-zinc-500 truncate font-semibold">
                    {capitalize(song.artistName)}
                  </p>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
