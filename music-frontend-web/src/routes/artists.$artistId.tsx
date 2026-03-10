import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { getCoverImageUrl, getBannerImageUrl } from "@/lib/s3";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Music, ArrowLeft, Clock, Calendar } from "lucide-react";
import { playerActions } from "@/Store/playerStore";
import { mapToPlayerSong, mapListToPlayerSongs } from "@/lib/player-utils";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";

export const Route = createFileRoute("/artists/$artistId")({
  component: ArtistDetailsPage,
});

function ArtistDetailsPage() {
  const { artistId } = Route.useParams();

  const { data: artist, isLoading: isArtistLoading } = useQuery({
    queryKey: ["artist", artistId],
    queryFn: () => musicApi.getArtist(artistId),
  });

  const {
    data: songsData,
    isLoading: isSongsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["artist-songs", artistId],
    queryFn: ({ pageParam = 1 }) =>
      musicApi.getArtistSongs(artistId, pageParam, 50),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.data || lastPage.data.length < 50) return undefined;
      return lastPage.meta.page + 1;
    },
  });

  const songs = songsData?.pages?.flatMap((page) => page.data) || [];

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  if (isArtistLoading || isSongsLoading) return <ArtistDetailsSkeleton />;
  if (!artist)
    return (
      <div className="p-8 text-center text-zinc-500">Artist not found</div>
    );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/" search={{ tab: "artist" }}>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/5 border border-white/5 group h-10 w-10 transition-all duration-300 active:scale-90"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-400 group-hover:text-primary transition-colors" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white capitalize text-glow-green">
            {artist.artistName}
          </h1>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative h-[350px] w-full overflow-hidden rounded-[40px] border border-white/5 glass-effect shadow-2xl group">
        {getBannerImageUrl(artist.storageKey, "large") ? (
          <img
            src={getBannerImageUrl(artist.storageKey, "large")!}
            alt={artist.artistName}
            className="h-full w-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full bg-linear-to-br from-primary/20 via-black to-black" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />

        <div className="absolute bottom-10 left-10 flex items-end gap-8">
          <div className="h-44 w-44 shrink-0 overflow-hidden rounded-3xl border-8 border-black shadow-2xl group-hover:scale-105 transition-transform duration-500">
            {getCoverImageUrl(artist.storageKey, "medium") ? (
              <img
                src={getCoverImageUrl(artist.storageKey, "medium")!}
                alt={artist.artistName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-700 text-6xl font-black">
                {artist.artistName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="pb-2 space-y-2">
            <Badge className="glass-effect text-primary border-primary/30 px-4 py-1.5 mb-2 font-bold uppercase text-[10px] tracking-widest">
              Verified Artist
            </Badge>
            <h2 className="text-6xl font-black text-white tracking-tighter drop-shadow-2xl capitalize text-glow-green">
              {artist.artistName}
            </h2>
            <p className="text-zinc-400 font-bold flex items-center gap-3 text-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {songsData?.pages[0]?.meta?.totalItems || songs.length} Tracks in
              Library
            </p>
            <div className="pt-6 flex items-center gap-4">
              <Button
                size="lg"
                className="rounded-full px-10 h-14 font-black gap-3 bg-white text-black hover:bg-white/90 shadow-2xl shadow-black/50 hover:scale-105 active:scale-95 transition-all duration-300"
                disabled={songs.length === 0}
                onClick={() => {
                  if (songs.length > 0) {
                    playerActions.setCurrentSong(mapToPlayerSong(songs[0]));
                    playerActions.setQueue(mapListToPlayerSongs(songs));
                  }
                }}
              >
                <Play className="h-6 w-6 fill-current" /> Play Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Popular Tracks
            </h3>
            <Button
              variant="link"
              className="text-primary p-0"
              disabled={songs.length === 0}
              onClick={() => {
                if (songs.length > 0) {
                  playerActions.setCurrentSong(mapToPlayerSong(songs[0]));
                  playerActions.setQueue(mapListToPlayerSongs(songs));
                }
              }}
            >
              Play All
            </Button>
          </div>

          <InfiniteScrollContainer
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          >
            <div className="flex flex-col gap-2">
              {songs.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl bg-zinc-900/50">
                  <Music className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500">
                    No tracks found for this artist yet.
                  </p>
                </div>
              ) : (
                songs.map((song: any, index: number) => (
                  <div
                    key={song.id}
                    className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5"
                    onClick={() => {
                      playerActions.setCurrentSong(mapToPlayerSong(song));
                      playerActions.setQueue(mapListToPlayerSongs(songs));
                    }}
                  >
                    <div className="w-8 text-center text-zinc-600 font-bold text-sm group-hover:text-primary transition-colors">
                      {(index + 1).toString().padStart(2, "0")}
                    </div>
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-zinc-900 shadow-lg">
                      {getCoverImageUrl(song.storageKey, "small", true) ? (
                        <img
                          src={
                            getCoverImageUrl(song.storageKey, "small", true)!
                          }
                          alt={song.title}
                          className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-zinc-700">
                          <Music className="h-6 w-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-6 w-6 fill-current text-white transform scale-90 group-hover:scale-100 transition-transform" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate group-hover:text-primary transition-colors capitalize">
                        {song.title}
                      </h4>
                      <p className="text-xs text-zinc-500 font-medium">
                        {song.genre} • {formatDate(song.releaseDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-500 text-xs font-bold uppercase tracking-wider pr-4">
                      <div className="hidden sm:flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(song.releaseDate)}
                      </div>
                      <div className="flex items-center gap-1.5 w-12 justify-end">
                        <Clock className="h-3 w-3" />
                        {formatDuration(song.durationMs)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </InfiniteScrollContainer>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-white tracking-tight">
            About
          </h3>
          <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 space-y-4">
            <p className="text-zinc-400 leading-relaxed">
              {artist.bio || "No biography available for this artist."}
            </p>
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Joined</span>
                <span className="text-white font-medium">
                  {formatDate(artist.createdAt)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Tracks</span>
                <span className="text-white font-medium">
                  {songsData?.pages[0]?.meta?.totalItems || songs.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtistDetailsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-zinc-900 rounded-full" />
        <div className="h-8 w-48 bg-zinc-900 rounded-lg" />
      </div>
      <div className="h-[300px] w-full bg-zinc-900 rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 w-32 bg-zinc-900 rounded mb-6" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 w-full bg-zinc-900 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-6 w-24 bg-zinc-900 rounded mb-6" />
          <div className="h-64 w-full bg-zinc-900 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
