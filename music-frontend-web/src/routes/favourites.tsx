import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { SongRow } from "@/components/custom/SongRow";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playerActions } from "@/Store/playerStore";
import { mapToPlayerSong } from "@/lib/player-utils";

export const Route = createFileRoute("/favourites")({
  component: FavouritesView,
});

function FavouritesView() {
  const [optimisticRemoved, setOptimisticRemoved] = React.useState<Set<string>>(new Set());

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

  const favorites = React.useMemo(() => {
    return (data?.pages?.flatMap((page) => page.data || []) || [])
      .filter((item: any) => item.song && !optimisticRemoved.has(item.song.id));
  }, [data, optimisticRemoved]);

  const handlePlayAll = () => {
    if (favorites.length === 0) return;
    
    // The favourite endpoint returns { song: { ... } }
    const songsToPlay = favorites
      .map((item: any) => mapToPlayerSong({ ...item.song, isLiked: true }))
      .filter((s): s is NonNullable<typeof s> => s !== null);
      
    if (songsToPlay.length > 0) {
      playerActions.playAll(songsToPlay);
    }
  };

  const handleOptimisticUnlike = (songId: string) => {
    setOptimisticRemoved(prev => new Set([...prev, songId]));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black tracking-tighter text-white">
            Favourites
          </h1>
          <p className="text-zinc-500">Your collection of liked songs</p>
        </div>
        {favorites.length > 0 && (
          <Button
            onClick={handlePlayAll}
            className="rounded-full bg-white text-black hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 gap-2 px-6 h-12"
          >
            <Play className="h-5 w-5 fill-current" />
            <span className="font-bold tracking-wide">Play All</span>
          </Button>
        )}
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

                return (
                  <SongRow
                    key={item.id}
                    song={{ ...song, isLiked: true }}
                    index={index}
                    onToggleFavorite={() => handleOptimisticUnlike(song.id)}
                  />
                );
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
