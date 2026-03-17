import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { SongRow } from "@/components/custom/SongRow";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";

export const Route = createFileRoute("/history")({
  component: HistoryView,
});

function HistoryView() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["history", "paginated"],
      queryFn: ({ pageParam = 1 }) => musicApi.getHistory(pageParam, 50),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (!lastPage || !lastPage?.data || lastPage.data?.length < 50)
          return undefined;
        return (lastPage.meta?.page ?? 0) + 1;
      },
    });

  const historyItems = data?.pages?.flatMap((page) => page.data || []) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          History
        </h1>
        <p className="text-zinc-500">Songs you've recently played</p>
      </div>

      <InfiniteScrollContainer
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      >
        <div className="flex flex-col gap-2">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 border-b border-zinc-900/30"
                >
                  <Skeleton className="h-12 w-12 rounded-lg bg-zinc-900" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3 bg-zinc-900" />
                    <Skeleton className="h-3 w-1/4 bg-zinc-900" />
                  </div>
                </div>
              ))
            : historyItems.map((item: any, index: number) => {
                const song = item.song;
                if (!song) return null;

                return <SongRow key={item.id} song={song} index={index} />;
              })}
        </div>
      </InfiniteScrollContainer>

      {!isLoading && historyItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">No history yet</p>
        </div>
      )}
    </div>
  );
}
