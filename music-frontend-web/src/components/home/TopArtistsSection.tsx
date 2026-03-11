import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play } from "lucide-react";
import { getCoverImageUrl } from "@/lib/s3";
import { capitalize } from "@/lib/utils";

interface TopArtistsSectionProps {
  artistsData: any;
  artistsLoading: boolean;
}

export function TopArtistsSection({
  artistsData,
  artistsLoading,
}: TopArtistsSectionProps) {
  const navigate = useNavigate();

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Top Artists
        </h2>
        <Button
          variant="link"
          className="text-primary hover:text-primary/80 font-semibold p-0"
          onClick={() => {
            navigate({
              to: "/artists",
            });
          }}
        >
          Explore
        </Button>
      </div>
      <div className="flex flex-row overflow-x-auto pl-2 pt-2 gap-8 pb-4 no-scrollbar">
        {artistsLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-none w-[120px] space-y-4">
                <Skeleton className="aspect-square w-full rounded-full bg-zinc-900/50" />
                <Skeleton className="h-4 w-3/4 bg-zinc-900/50 mx-auto" />
              </div>
            ))
          : artistsData?.data?.map((artist: any) => (
              <Link
                key={artist.id}
                to="/artists/$artistId"
                params={{ artistId: artist.id }}
                className="flex-none w-[140px] group relative space-y-4 cursor-pointer text-center"
              >
                <div className="relative aspect-square overflow-hidden rounded-full bg-zinc-900 border border-white/5 mx-auto ring-offset-4 ring-offset-black ring-0 group-hover:ring-4 ring-primary/40 transition-all duration-700 shadow-2xl">
                  {artist.storageKey ? (
                    <img
                      src={getCoverImageUrl(artist.storageKey, "medium") || ""}
                      alt={artist.artistName}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
                      <span className="text-2xl font-black">
                        {artist.artistName?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <Play className="h-8 w-8 fill-current text-white transform scale-75 group-hover:scale-100 transition-transform" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors text-sm">
                    {capitalize(artist.artistName)}
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                    Artist
                  </p>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}
