import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play } from "lucide-react";
import { getCoverImageUrl } from "@/lib/s3";

interface FeaturedPlaylistsSectionProps {
  playlistsData: any;
  playlistsLoading: boolean;
}

export function FeaturedPlaylistsSection({
  playlistsData,
  playlistsLoading,
}: FeaturedPlaylistsSectionProps) {
  const navigate = useNavigate();

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Featured Playlists
        </h2>
        <Button
          variant="link"
          className="text-primary hover:text-primary/80 font-semibold p-0"
          onClick={() => {
            navigate({
              to: "/playlists",
            });
          }}
        >
          See all
        </Button>
      </div>
      <div className="flex flex-row overflow-x-auto gap-6 pb-4 no-scrollbar">
        {playlistsLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-none w-[104px] space-y-4">
                <Skeleton className="aspect-square w-full rounded-2xl bg-zinc-900/50" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-zinc-900/50" />
                  <Skeleton className="h-3 w-1/2 bg-zinc-900/50" />
                </div>
              </div>
            ))
          : playlistsData?.data?.map((playlist: any) => (
              <Link
                key={playlist.id}
                to="/playlists/$playlistId"
                params={{ playlistId: playlist.id }}
                className="flex-none w-[144px] group relative space-y-4 cursor-pointer hover-scale"
              >
                <div className="relative aspect-square overflow-hidden rounded-3xl bg-zinc-900 border border-white/5 shadow-2xl group-hover:border-white/10 transition-colors">
                  {playlist.storageKey ? (
                    <img
                      src={
                        getCoverImageUrl(playlist.storageKey, "medium") || ""
                      }
                      alt={playlist.title}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
                      <Play className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <Button
                      size="icon"
                      className="h-10 w-10 rounded-full bg-primary hover:scale-110 transition-transform shadow-2xl shadow-primary/40"
                    >
                      <Play className="h-5 w-5 fill-current text-white" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 px-1">
                  <h3 className="font-semibold text-white truncate group-hover:text-primary transition-colors text-lg">
                    {playlist.title}
                  </h3>
                  <p className="text-sm text-zinc-500 truncate font-medium">
                    {playlist.description || "Collection"}
                  </p>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}
