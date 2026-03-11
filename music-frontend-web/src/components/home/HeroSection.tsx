import React from "react";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCoverImageUrl } from "@/lib/s3";
import { playerActions } from "@/Store/playerStore";
import { mapToPlayerSong } from "@/lib/player-utils";

interface HeroSectionProps {
  featuredData: any;
  featuredLoading: boolean;
  featuredIndex: number;
  setFeaturedIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function HeroSection({
  featuredData,
  featuredLoading,
  featuredIndex,
  setFeaturedIndex,
}: HeroSectionProps) {
  const featuredSongsCount = featuredData?.data?.length || 0;
  const featuredSong =
    featuredData?.data?.[featuredIndex] || featuredData?.data?.[0];

  if (featuredLoading) {
    return (
      <Skeleton className="h-[400px] w-full rounded-[40px] bg-white/10 border border-white/5" />
    );
  }

  if (!featuredSong) return null;

  return (
    <section className="relative h-[400px] overflow-hidden rounded-[40px] glass-effect border border-white/10 p-12 flex flex-col justify-end group transition-all duration-700">
      {/* Background Image/Overlay */}
      <div className="absolute inset-0 z-0 bg-black">
        {featuredData?.data?.map(
          (item: any, idx: number) =>
            item.storageKey && (
              <img
                key={item.id}
                src={getCoverImageUrl(item.storageKey, "large", true)!}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-in-out blur-[1.92px] ${
                  idx === featuredIndex
                    ? "opacity-30 scale-100"
                    : "opacity-0 scale-105"
                }`}
              />
            ),
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <Badge className="w-fit glass-effect border-primary/30 px-4 py-1.5 backdrop-blur-md font-bold tracking-wider text-[10px] uppercase">
          Featured Release
        </Badge>

        <div
          className="transition-all duration-700 ease-in-out"
          key={featuredSong.id}
        >
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-2 drop-shadow-2xl capitalize line-clamp-2 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-700">
            {featuredSong.title}
          </h1>
          <p className="max-w-md text-zinc-300 text-lg mb-8 font-medium animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
            by{" "}
            <span className="text-white font-bold">
              {featuredSong.artistName}
            </span>
          </p>
          <div className="flex gap-4 items-center justify-between">
            <Button
              size="lg"
              className="rounded-full px-8 h-12 font-black gap-3 bg-primary text-black hover:bg-white/90 shadow-2xl shadow-black/50 hover:scale-105 active:scale-95 transition-all duration-300"
              onClick={() => {
                playerActions.playSong(mapToPlayerSong(featuredSong));
              }}
            >
              <Play className="h-6 w-6 fill-current" /> Play Now
            </Button>

            {/* Pagination Dots */}
            {featuredSongsCount > 1 && (
              <div className="flex items-center gap-2 pr-4">
                {featuredData.data.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setFeaturedIndex(idx)}
                    className={`rounded-full transition-all duration-500 ${
                      idx === featuredIndex
                        ? "w-8 h-2.5 bg-primary "
                        : "w-2.5 h-2.5 bg-white/20 hover:bg-white/40"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
