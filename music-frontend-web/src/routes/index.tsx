import React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Play, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";
import { getCoverImageUrl } from "@/lib/s3";
import { SongRow } from "@/components/custom/SongRow";
import { playerStore, playerActions } from "@/Store/playerStore";
import { mapToPlayerSong, mapListToPlayerSongs } from "@/lib/player-utils";

export const Route = createFileRoute("/")({
  component: HomeFeed,
});

function HomeFeed() {
  const navigate = useNavigate();

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ["trending"],
    queryFn: () => musicApi.getTrending(),
  });

  const {
    data: songsData,
    isLoading: songsLoading,
    fetchNextPage: fetchNextSongs,
    hasNextPage: hasNextSongs,
    isFetchingNextPage: isFetchingNextSongs,
  } = useInfiniteQuery({
    queryKey: ["songs"],
    queryFn: ({ pageParam = 1 }) => musicApi.getSongs(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage?.data || lastPage.data?.length < 20)
        return undefined;
      return (lastPage.meta?.page ?? 0) + 1;
    },
  });

  const allSongs = songsData?.pages?.flatMap((page) => page.data || []) || [];

  const { data: artistsData, isLoading: artistsLoading } = useQuery({
    queryKey: ["artists"],
    queryFn: () => musicApi.getArtists(),
  });

  const { data: playlistsData, isLoading: playlistsLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: () => musicApi.getPlaylists(),
  });

  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ["featured"],
    queryFn: () => musicApi.getFeatured(),
  });

  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ["feed"],
    queryFn: () => musicApi.getFeed(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Fallback 1: Sync Trending Songs to queue if empty
  React.useEffect(() => {
    const horizontalQueue = playerStore.state.queue;
    if (
      horizontalQueue.length === 0 &&
      trendingData?.data &&
      trendingData.data.length > 0
    ) {
      playerActions.syncFeedToQueue(mapListToPlayerSongs(trendingData.data));
    }
  }, [trendingData]);

  // Fallback 2: Sync All Songs to queue if still empty
  React.useEffect(() => {
    const horizontalQueue = playerStore.state.queue;
    if (horizontalQueue.length === 0 && allSongs.length > 0) {
      playerActions.syncFeedToQueue(mapListToPlayerSongs(allSongs));
    }
  }, [allSongs]);

  // Primary: Sync Personalized Feed to queue (replaces fallback)
  React.useEffect(() => {
    if (feedData?.data && feedData.data.length > 0) {
      playerActions.syncFeedToQueue(mapListToPlayerSongs(feedData.data));
    }
  }, [feedData]);

  const featuredSong = featuredData?.data?.[0];

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      {featuredLoading ? (
        <Skeleton className="h-[400px] w-full rounded-[40px] bg-white/10 border border-white/5" />
      ) : (
        featuredSong && (
          <section className="relative h-[400px] overflow-hidden rounded-[40px] glass-effect border border-white/10 p-12 flex flex-col justify-end group transition-all duration-700">
            {/* Background Image/Overlay */}
            <div className="absolute inset-0 z-0">
              {featuredSong.storageKey && (
                <img
                  src={
                    getCoverImageUrl(featuredSong.storageKey, "large", true)!
                  }
                  alt=""
                  className="h-full w-full object-cover opacity-30 group-hover:opacity-30 transition-opacity duration-700 blur-[1.92px]"
                />
              )}
              <div className="absolute inset-0 " />
            </div>

            <div className="relative z-10">
              <Badge className="mb-6 w-fit glass-effect  border-primary/30 px-4 py-1.5 backdrop-blur-md font-bold tracking-wider text-[10px] uppercase">
                Featured Release!
              </Badge>
              <h1 className="text-4xl md:text-4xl font-black tracking-tighter text-white mb-2 drop-shadow-2xl capitalize line-clamp-2 max-w-2xl">
                {featuredSong.title}
              </h1>
              <p className="max-w-md text-zinc-300 text-md mb-8 font-medium">
                by{" "}
                <span className="text-white font-bold">
                  {featuredSong.artistName}
                </span>
              </p>
              <div className="flex gap-4">
                <Button
                  size="lg"
                  className="rounded-full px-7 h-12 font-black gap-3 bg-primary text-black hover:bg-white/90 shadow-2xl shadow-black/50 hover:scale-105 active:scale-95 transition-all duration-300"
                  onClick={() => {
                    playerActions.playSong(mapToPlayerSong(featuredSong));
                  }}
                >
                  <Play className="h-6 w-6 fill-current" /> Play Now
                </Button>
              </div>
            </div>
          </section>
        )
      )}

      {/* Discover For You (Personalized Feed) */}
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

      {/* Top Artists Section */}
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
                        src={
                          getCoverImageUrl(artist.storageKey, "medium") || ""
                        }
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
                      {artist.artistName}
                    </h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                      Artist
                    </p>
                  </div>
                </Link>
              ))}
        </div>
      </section>

      {/* Playlists Section */}
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

      {/* Trending Now Section */}
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
                      {song.title}
                    </h3>
                    <p className="text-xs text-zinc-500 truncate font-semibold">
                      {song.artistName}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* One Melody Vertical Section */}
      <section>
        <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Songs
          </h2>
        </div>

        <InfiniteScrollContainer
          fetchNextPage={fetchNextSongs}
          hasNextPage={hasNextSongs}
          isFetchingNextPage={isFetchingNextSongs}
        >
          <div className="flex flex-col gap-1 pb-10">
            {songsLoading
              ? Array.from({ length: 10 }).map((_, i) => (
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
              : allSongs.map((song: any, index: number) => (
                  <SongRow key={song.id} song={song} index={index} />
                ))}
          </div>
        </InfiniteScrollContainer>
      </section>
    </div>
  );
}
