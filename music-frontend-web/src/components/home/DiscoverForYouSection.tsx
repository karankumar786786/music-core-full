import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Music } from "lucide-react";
import { getCoverImageUrl } from "@/lib/s3";
import { playerActions } from "@/Store/playerStore";
import { mapToPlayerSong } from "@/lib/player-utils";

interface DiscoverForYouSectionProps {
  feedData: any;
  feedLoading: boolean;
}

export function DiscoverForYouSection({
  feedData,
  feedLoading,
}: DiscoverForYouSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Discover For You
          </h2>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Personalized recommendations based on your taste
          </p>
        </div>
      </div>
      <div className="flex flex-row overflow-x-auto gap-6 pb-4 no-scrollbar">
        {feedLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-none w-[180px] space-y-4">
                <Skeleton className="aspect-square w-full rounded-3xl bg-zinc-900/50" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-zinc-900/50" />
                  <Skeleton className="h-3 w-1/2 bg-zinc-900/50" />
                </div>
              </div>
            ))
          : feedData?.data?.map((song: any) => (
              <div
                key={song.id}
                className="flex-none w-[180px] group relative space-y-4 cursor-pointer"
                onClick={() => playerActions.playSong(mapToPlayerSong(song))}
              >
                <div className="relative aspect-square overflow-hidden rounded-3xl bg-zinc-900 border border-white/5 shadow-xl transition-all duration-500 group-hover:border-primary/20">
                  {song.storageKey ? (
                    <img
                      src={getCoverImageUrl(song.storageKey, "medium", true)!}
                      alt={song.title}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
                      <Play className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <Button
                      size="icon"
                      className="h-12 w-12 rounded-full bg-primary hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-primary/40"
                    >
                      <Play className="h-6 w-6 fill-current text-white" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors text-sm tracking-tight">
                    {song.title}
                  </h3>
                  <p className="text-[10px] text-zinc-500 truncate font-bold uppercase tracking-widest mt-0.5">
                    {song.artistName}
                  </p>
                </div>
              </div>
            ))}
        {!feedLoading && (!feedData?.data || feedData.data.length === 0) && (
          <div className="w-full py-10 flex flex-col items-center justify-center border border-white/5 bg-white/5 rounded-3xl text-zinc-500 text-sm">
            <Music className="h-10 w-10 mb-2 opacity-20" />
            <p>Start listening to get personalized recommendations</p>
          </div>
        )}
      </div>
    </section>
  );
}
