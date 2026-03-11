import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";
import { playerStore, playerActions } from "@/Store/playerStore";
import { mapListToPlayerSongs } from "@/lib/player-utils";
import { HeroSection } from "@/components/home/HeroSection";
import { TopArtistsSection } from "@/components/home/TopArtistsSection";
import { FeaturedPlaylistsSection } from "@/components/home/FeaturedPlaylistsSection";
import { TrendingNowSection } from "@/components/home/TrendingNowSection";
import { DiscoverForYouSection } from "@/components/home/DiscoverForYouSection";
import { SongRow } from "@/components/custom/SongRow";
export const Route = createFileRoute("/")({
  component: HomeFeed,
});

function HomeFeed() {
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

  const allSongs = React.useMemo(
    () => songsData?.pages?.flatMap((page) => page.data || []) || [],
    [songsData],
  );

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

  const [featuredIndex, setFeaturedIndex] = React.useState(0);

  // Auto-switch featured songs
  React.useEffect(() => {
    if (!featuredData?.data || featuredData.data.length <= 1) return;

    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredData.data.length);
    }, 50000);

    return () => clearInterval(interval);
  }, [featuredData?.data]);

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

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <HeroSection
        featuredData={featuredData}
        featuredLoading={featuredLoading}
        featuredIndex={featuredIndex}
        setFeaturedIndex={setFeaturedIndex}
      />

      {/* Top Artists Section */}
      <TopArtistsSection
        artistsData={artistsData}
        artistsLoading={artistsLoading}
      />

      {/* Playlists Section */}
      <FeaturedPlaylistsSection
        playlistsData={playlistsData}
        playlistsLoading={playlistsLoading}
      />

      {/* Trending Now Section */}
      <TrendingNowSection
        trendingData={trendingData}
        trendingLoading={trendingLoading}
      />

      {/* Discover For You (Personalized Feed) */}
      <DiscoverForYouSection feedData={feedData} feedLoading={feedLoading} />

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
