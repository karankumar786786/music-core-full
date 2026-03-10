import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { SongRow } from "@/components/custom/SongRow";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";

export const Route = createFileRoute("/favourites")({
  component: FavouritesView,
});

function FavouritesView() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["favourites", "paginated"],
      queryFn: ({ pageParam = 1 }) => musicApi.getFavourites(pageParam, 50),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (!lastPage || !lastPage?.data || lastPage.data?.length < 50)
          return undefined;
        return (lastPage.meta?.page ?? 0) + 1;
      },
    });

  const favorites = data?.pages?.flatMap((page) => page.data || []) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          Favourites
        </h1>
        <p className="text-zinc-500">Your collection of liked songs</p>
      </div>

      <InfiniteScrollContainer
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        className="pb-10"
      >
        <div className="flex flex-col gap-1">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 rounded-xl animate-pulse"
                >
                  <div className="h-12 w-12 rounded-lg bg-zinc-900" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 bg-zinc-900" />
                    <div className="h-2 w-1/4 bg-zinc-900" />
                  </div>
                </div>
              ))
            : favorites.map((item: any, index: number) => {
                const song = item.song;
                if (!song) return null;

                return <SongRow key={item.id} song={song} index={index} />;
              })}
        </div>
      </InfiniteScrollContainer>

      {!isLoading && favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">No favourites yet</p>
        </div>
      )}
    </div>
  );
}
