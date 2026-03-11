import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ListMusic, Play } from "lucide-react";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";
import { getCoverImageUrl } from "@/lib/s3";

export const Route = createFileRoute("/playlists/")({
  component: PlaylistsView,
});

function PlaylistsView() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["playlists", "paginated"],
      queryFn: ({ pageParam = 1 }) => musicApi.getPlaylists(pageParam, 20),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (!lastPage || !lastPage?.data || lastPage.data?.length < 20)
          return undefined;
        return (lastPage.meta?.page ?? 0) + 1;
      },
    });

  const playlists = data?.pages?.flatMap((page) => page.data || []) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          Playlists
        </h1>
        <p className="text-zinc-500">Hand-picked collections for you</p>
      </div>

      <InfiniteScrollContainer
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      >
        <div className="flex flex-col">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-6 p-5 border-b border-zinc-900/50"
                >
                  <Skeleton className="h-20 w-20 rounded-lg bg-zinc-900" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-1/3 bg-zinc-900" />
                    <Skeleton className="h-4 w-1/2 bg-zinc-900" />
                  </div>
                </div>
              ))
            : playlists.map((playlist: any) => (
                <Link
                  key={playlist.id}
                  to="/playlists/$playlistId"
                  params={{ playlistId: playlist.id }}
                  className="group flex items-center justify-between p-5 rounded-2xl hover:bg-zinc-800/50 transition-all duration-200 cursor-pointer border-b border-zinc-900/50"
                >
                  <div className="flex items-center gap-6 flex-1">
                    <div className="relative h-20 w-20 shrink-0 shadow-2xl">
                      {playlist.storageKey || playlist.coverUrl ? (
                        <img
                          src={
                            playlist.coverUrl ||
                            getCoverImageUrl(playlist.storageKey, "medium") ||
                            ""
                          }
                          alt={playlist.title}
                          className="rounded-xl object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-xl border border-white/5">
                          <ListMusic className="h-10 w-10 text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                        <Play
                          fill="white"
                          size={24}
                          className="text-white transform scale-90 group-hover:scale-100 transition-transform duration-200"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col min-w-0 space-y-1">
                      <h3 className="text-white font-bold text-lg truncate group-hover:text-primary transition-colors">
                        {playlist.title}
                      </h3>
                      <p className="text-zinc-500 text-sm font-medium line-clamp-1">
                        {playlist.description || "Public Playlist • One Melody"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-4 hidden sm:block">
                    <p className="text-zinc-500 text-xs font-semibold group-hover:text-zinc-300 transition-colors uppercase tracking-widest">
                      Playlist
                    </p>
                  </div>
                </Link>
              ))}
        </div>
      </InfiniteScrollContainer>

      {!isLoading && playlists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">No playlists found</p>
        </div>
      )}
    </div>
  );
}
