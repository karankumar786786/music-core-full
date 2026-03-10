import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import axios from "axios";
import { z } from "zod";
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Play,
  ListMusic,
  ChevronRight,
  Music,
  Camera,
  User,
  Mail,
  Check,
  X,
  Loader2,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "@/components/custom/SongActions";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";
import { getCoverImageUrl } from "@/lib/s3";
import { SongRow } from "@/components/custom/SongRow";
import { playerActions } from "@/Store/playerStore";
import { mapToPlayerSong, mapListToPlayerSongs } from "@/lib/player-utils";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const homeSearchSchema = z.object({
  tab: z
    .enum([
      "home",
      "artist",
      "playlist",
      "favourites",
      "history",
      "search",
      "profile",
    ])
    .catch("home")
    .optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: (search) => homeSearchSchema.parse(search),
  component: HomeComponent,
});

function HomeComponent() {
  const { tab = "home" } = Route.useSearch();

  switch (tab) {
    case "artist":
      return <ArtistsView />;
    case "playlist":
      return <PlaylistsView />;
    case "favourites":
      return <FavouritesView />;
    case "history":
      return <HistoryView />;
    case "search":
      return <SearchResultsView />;
    case "profile":
      return <ProfileView />;
    case "home":
    default:
      return <HomeFeed />;
  }
}

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
                Featured Release
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
                    playerActions.setCurrentSong(mapToPlayerSong(featuredSong));
                    playerActions.setQueue(
                      mapListToPlayerSongs(featuredData.data),
                    );
                  }}
                >
                  <Play className="h-6 w-6 fill-current" /> Play Now
                </Button>
              </div>
            </div>
          </section>
        )
      )}

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
                to: "/",
                search: (prev: any) => ({ ...prev, tab: "artist" }),
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
                to: "/",
                search: (prev: any) => ({ ...prev, tab: "playlist" }),
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
                        <ListMusic className="h-10 w-10 opacity-20" />
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
                    playerActions.setCurrentSong(mapToPlayerSong(song));
                    playerActions.setQueue(
                      mapListToPlayerSongs(trendingData.data),
                    );
                  }}
                >
                  <div className="relative aspect-4/3 overflow-hidden rounded-3xl bg-zinc-900 border border-white/5 shadow-xl">
                    {song.storageKey ? (
                      <img
                        src={
                          getCoverImageUrl(song.storageKey, "medium", true) ||
                          ""
                        }
                        alt={song.title}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        <ListMusic className="h-10 w-10 opacity-20" />
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
                  <SongRow
                    key={song.id}
                    song={song}
                    index={index}
                    queue={allSongs}
                  />
                ))}
          </div>
        </InfiniteScrollContainer>
      </section>
    </div>
  );
}

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
                    {artist.storageKey ? (
                      <img
                        src={
                          getCoverImageUrl(artist.storageKey, "medium") || ""
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

                return (
                  <SongRow
                    key={item.id}
                    song={song}
                    index={index}
                    queue={favorites.map((i: any) => i.song).filter(Boolean)}
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

                return (
                  <SongRow
                    key={item.id}
                    song={song}
                    index={index}
                    queue={historyItems.map((i: any) => i.song).filter(Boolean)}
                  />
                );
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
                      {playlist.storageKey ? (
                        <img
                          src={
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

                  <div className="text-right flex-shrink-0 ml-4 hidden sm:block">
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
function SearchResultsView() {
  const { q } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () => musicApi.search(q || ""),
    enabled: !!q,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          Search Results
        </h1>
        <p className="text-zinc-500">
          {q ? `Showing results for "${q}"` : "Enter a search term"}
        </p>
      </div>

      {!q ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">Try searching for songs, artists, or albums</p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
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
          ))}
        </div>
      ) : !data?.data?.songs?.length &&
        !data?.data?.artists?.length &&
        !data?.data?.playlists?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">No results found for "{q}"</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Songs Results */}
          {data?.data?.songs && data?.data?.songs?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Songs
              </h2>
              <div className="flex flex-col gap-2">
                {data.data.songs.map((song: any) => (
                  <div
                    key={song.id}
                    className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg shadow-lg">
                      {song.storageKey ? (
                        <img
                          src={
                            getCoverImageUrl(song.storageKey, "small", true) ||
                            ""
                          }
                          alt={song.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                          <Music className="h-6 w-6 text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-4 w-4 fill-current text-white" />
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <h3 className="font-semibold text-white truncate group-hover:text-primary transition-colors text-sm">
                        {song.title}
                      </h3>
                      <p className="text-[10px] text-zinc-500 truncate font-medium">
                        {song.artistName}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <FavoriteButton
                        songId={song.id}
                        isLiked={song.isLiked || false}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-zinc-500 hover:text-primary hover:bg-zinc-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          playerActions.setCurrentSong(mapToPlayerSong(song));
                          playerActions.setQueue(
                            mapListToPlayerSongs(data.data.songs),
                          );
                        }}
                      >
                        <Play className="h-4 w-4 fill-current" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Artist Results */}
          {data?.data?.artists && data?.data?.artists?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Artists
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {data.data.artists.map((artist: any) => (
                  <Link
                    key={artist.id}
                    to="/artists/$artistId"
                    params={{ artistId: artist.id }}
                    className="group flex flex-col items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all text-center"
                  >
                    <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full shadow-2xl border-4 border-white/5 bg-zinc-900">
                      {artist.storageKey ? (
                        <img
                          src={
                            getCoverImageUrl(artist.storageKey, "medium") || ""
                          }
                          alt={artist.artistName}
                          className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-primary text-4xl font-black">
                          {artist.artistName?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <h4 className="font-bold text-white truncate group-hover:text-primary transition-colors w-full uppercase tracking-tighter text-sm">
                      {artist.artistName}
                    </h4>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Playlist Results */}
          {data?.data?.playlists && data?.data?.playlists?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Playlists
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.data.playlists.map((playlist: any) => (
                  <Link
                    key={playlist.id}
                    to="/playlists/$playlistId"
                    params={{ playlistId: playlist.id }}
                    className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all border border-white/5 bg-zinc-900/50"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
                      {playlist.storageKey ? (
                        <img
                          src={
                            getCoverImageUrl(playlist.storageKey, "medium") ||
                            ""
                          }
                          alt={playlist.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                          <ListMusic className="h-8 w-8 text-zinc-700" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate group-hover:text-primary transition-colors">
                        {playlist.title}
                      </h4>
                      <p className="text-xs text-zinc-500 line-clamp-1">
                        {playlist.description || "Public Playlist"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileView() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => musicApi.getProfile(),
  });

  const [editName, setEditName] = useState(user?.name || "");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; profilePictureKey?: string }) =>
      musicApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { uploadUrl, key } = await musicApi.getProfilePictureUploadUrl(
        file.name,
        file.type,
      );
      await axios.put(uploadUrl, file, {
        headers: { "Content-Type": file.type },
      });
      return key;
    },
    onSuccess: (key) => {
      updateProfileMutation.mutate({ profilePictureKey: key });
    },
    onError: (error: any) => {
      console.error("Upload failed:", error);
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      uploadMutation.mutate(file);
    }
  };

  const handleSave = () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    updateProfileMutation.mutate({ name: editName });
  };

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => musicApi.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setIsPasswordModalOpen(false);
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to change password");
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    changePasswordMutation.mutate({
      oldPassword: passwords.oldPassword,
      newPassword: passwords.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-zinc-500 font-medium">Loading profile...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto h-full overflow-hidden">
      {/* Banner */}
      <div className="relative h-48 w-full rounded-[40px] overflow-hidden">
        <div className="absolute inset-0 " />
      </div>

      {/* Avatar + Name row — overlaps banner */}
      <div className="relative px-10 -mt-20 mb-8 flex items-end gap-8">
        {/* Avatar */}
        <div
          className="relative group cursor-pointer shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Avatar className="h-36 w-36 rounded-[28px]   shadow-2xl transition-transform duration-300 group-hover:scale-[1.03]">
            <AvatarImage
              src={getCoverImageUrl(user.profilePictureKey, "large") || ""}
              alt={user.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/20 text-primary">
              <User className="h-16 w-16" />
            </AvatarFallback>

            {uploadMutation.isPending && (
              <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] z-20">
              <Camera className="h-8 w-8 text-white" />
            </div>
          </Avatar>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        {/* Name + meta */}
        <div className="pb-2 flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-2xl font-black bg-white/5 border-white/10 h-12 w-72 rounded-2xl focus:ring-primary/20"
                  autoFocus
                />
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-2xl bg-primary text-black hover:bg-white"
                  onClick={handleSave}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-12 w-12 rounded-2xl bg-white/5 text-white hover:bg-white/10"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(user.name);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-4xl font-black tracking-tighter text-white truncate">
                  {user.name}
                </h1>
                <Button
                  variant="ghost"
                  className="h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-sm shrink-0"
                  onClick={() => {
                    setEditName(user.name);
                    setIsEditing(true);
                  }}
                >
                  Edit Profile
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-5 text-zinc-400 text-sm font-medium flex-wrap">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span className="capitalize">{user.role || "Member"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="px-2 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left — Account Settings */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Account Settings
          </h2>
          <div className="glass-effect rounded-[32px] border border-white/5 overflow-hidden divide-y divide-white/5">
            <div
              className="p-6 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between group"
              onClick={() => setIsPasswordModalOpen(true)}
            >
              <div className="space-y-0.5">
                <p className="font-bold text-white group-hover:text-primary transition-colors">
                  Change Password
                </p>
                <p className="text-xs text-zinc-500 font-medium">
                  Update your password and security settings
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-700 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>

        {/* Right — Sign Out */}
        <div className="md:col-span-1 space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Session
          </h2>
          <div className="glass-effect rounded-[32px] border border-white/5 p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Signed in as</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full h-12 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/10 font-bold transition-all duration-300"
              onClick={() => {
                musicApi.logout();
                window.location.reload();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              Change Password
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-4">
            <div className="space-y-2 relative">
              <Label className="text-zinc-400 font-bold text-xs uppercase tracking-wider">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  type={showOldPassword ? "text" : "password"}
                  value={passwords.oldPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, oldPassword: e.target.value })
                  }
                  className="bg-zinc-900 border-white/5 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-white"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                >
                  {showOldPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2 relative">
              <Label className="text-zinc-400 font-bold text-xs uppercase tracking-wider">
                New Password
              </Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={passwords.newPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, newPassword: e.target.value })
                  }
                  className="bg-zinc-900 border-white/5 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-white"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2 relative">
              <Label className="text-zinc-400 font-bold text-xs uppercase tracking-wider">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    setPasswords({
                      ...passwords,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="bg-zinc-900 border-white/5 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-white"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-black font-bold hover:bg-primary/90 mt-6"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
