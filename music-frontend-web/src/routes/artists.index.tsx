import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";
import { getCoverImageUrl } from "@/lib/s3";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/artists/")({
  component: ArtistsView,
});

function ArtistsView() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["artists", "paginated"],
      queryFn: ({ pageParam = 1 }) => musicApi.getArtists(pageParam, 20),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (!lastPage || !lastPage?.data || lastPage.data?.length < 20)
          return undefined;
        return (lastPage.meta?.page ?? 0) + 1;
      },
    });

  const artists = data?.pages?.flatMap((page) => page.data || []) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          Artists
        </h1>
        <p className="text-zinc-500">Discover your favorite artists</p>
      </div>

      <InfiniteScrollContainer
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      >
        <div className="flex flex-col gap-2">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-6 p-4">
                  <Skeleton className="h-20 w-20 rounded-full bg-zinc-900" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-1/4 bg-zinc-900" />
                    <Skeleton className="h-4 w-1/2 bg-zinc-900" />
                  </div>
                </div>
              ))
            : artists.map((artist: any) => (
                <Link
                  key={artist.id}
                  to="/artists/$artistId"
                  params={{ artistId: artist.id }}
                  className="group flex items-center gap-6 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-900 group-hover:ring-primary/50 transition-all">
                    {artist.storageKey || artist.coverUrl ? (
                      <img
                        src={
                          artist.coverUrl ||
                          getCoverImageUrl(artist.storageKey, "medium") ||
                          ""
                        }
                        alt={artist.artistName}
                        className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-2xl font-bold">
                        {artist.artistName?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-white tracking-tight group-hover:text-primary transition-colors">
                        {artist.artistName}
                      </h2>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase tracking-widest bg-zinc-900 text-zinc-500 border-zinc-800"
                      >
                        Artist
                      </Badge>
                    </div>
                    <p className="text-zinc-400 text-sm line-clamp-1 max-w-2xl font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                      {artist.bio || "No bio available for this artist."}
                    </p>
                  </div>

                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 p-2 text-zinc-500 hover:text-white">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </Link>
              ))}
        </div>
      </InfiniteScrollContainer>

      {!isLoading && artists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">No artists found</p>
        </div>
      )}
    </div>
  );
}
