import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { getCoverImageUrl } from "@/lib/s3";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  Music,
  ArrowLeft,
  Clock,
  ListMusic,
  MoreHorizontal,
} from "lucide-react";
import { playerActions } from "@/Store/playerStore";
import { mapToPlayerSong, mapListToPlayerSongs } from "@/lib/player-utils";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";

export const Route = createFileRoute("/playlists/$playlistId")({
  component: PlaylistDetailsPage,
});

function PlaylistDetailsPage() {
  const { playlistId } = Route.useParams();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["playlist", playlistId],
      queryFn: ({ pageParam = 1 }) =>
        musicApi.getPlaylist(playlistId, pageParam, 50),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (!lastPage?.songs?.data || lastPage.songs.data?.length < 50)
          return undefined;
        return lastPage.songs.meta.page + 1;
      },
    });

  const playlist = data?.pages[0];
  const allSongsData =
    data?.pages.flatMap((page) => page.songs?.data || []) || [];
  const songs = allSongsData.map((item: any) => item.song).filter(Boolean);

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
      day: "numeric",
    });
  };

  if (isLoading) return <PlaylistDetailsSkeleton />;
  if (!playlist)
    return (
      <div className="p-8 text-center text-zinc-500">Playlist not found</div>
    );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/" search={{ tab: "playlist" }}>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-zinc-900 border border-white/5"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-400" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white">
            {playlist.title}
          </h1>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative flex flex-col md:flex-row gap-8 p-8 rounded-3xl bg-linear-to-br from-zinc-900 via-black to-black border border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
          <div className="h-64 w-64 rounded-full bg-primary blur-3xl" />
        </div>

        {/* Cover Image */}
        <div className="relative h-64 w-64 shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/50 border border-white/10 mx-auto md:mx-0">
          {getCoverImageUrl(playlist.storageKey, "medium") ? (
            <img
              src={getCoverImageUrl(playlist.storageKey, "medium")!}
              alt={playlist.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-700">
              <ListMusic className="h-24 w-24" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Info */}
        <div className="flex flex-col justify-end gap-4 flex-1">
          <div className="space-y-1">
            <Badge className="bg-primary/20 text-primary border-primary/20 px-3 py-1 mb-2">
              Public Playlist
            </Badge>
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">
              {playlist.title}
            </h2>
            <p className="text-zinc-400 text-lg font-medium max-w-2xl leading-relaxed">
              {playlist.description ||
                "A curated collection of tracks for your listening pleasure."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4">
            <Button
              size="lg"
              className="rounded-full px-8 font-bold gap-2 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
              disabled={songs.length === 0}
              onClick={() => {
                if (songs.length > 0) {
                  playerActions.setCurrentSong(mapToPlayerSong(songs[0]));
                  playerActions.setQueue(mapListToPlayerSongs(songs));
                }
              }}
            >
              <Play className="h-5 w-5 fill-current" /> Play Now
            </Button>

            <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900/50 px-5 py-2.5 rounded-full border border-white/5">
              <span className="flex items-center gap-2">
                <Music className="h-4 w-4 text-primary" />
                {playlist.songs?.meta?.totalItems || songs.length} Songs
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-800" />
              <span>{formatDate(playlist.createdAt)}</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-white/5 hover:bg-zinc-900"
            >
              <MoreHorizontal className="h-5 w-5 text-zinc-400" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tracks Section */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4 px-2">
          <div className="grid grid-cols-12 w-full text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-6 md:col-span-5">Title</div>
            <div className="col-span-3 hidden md:block">Artist</div>
            <div className="col-span-2 hidden lg:block">Album</div>
            <div className="col-span-5 md:col-span-1 text-right pr-4">
              <Clock className="h-3 w-3 inline" />
            </div>
          </div>
        </div>

        <InfiniteScrollContainer
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        >
          <div className="flex flex-col gap-1">
            {songs.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl bg-zinc-900/30">
                <Music className="h-12 w-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 font-medium italic">
                  This playlist is currently empty.
                </p>
              </div>
            ) : (
              songs.map((song: any, index: number) => {
                return (
                  <div
                    key={song.id}
                    className="group grid grid-cols-12 w-full items-center p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5"
                    onClick={() => {
                      playerActions.setCurrentSong(mapToPlayerSong(song));
                      playerActions.setQueue(mapListToPlayerSongs(songs));
                    }}
                  >
                    <div className="col-span-1 text-center text-zinc-600 font-bold text-sm group-hover:text-primary transition-colors">
                      {(index + 1).toString().padStart(2, "0")}
                    </div>

                    <div className="col-span-11 md:col-span-11 grid grid-cols-11 items-center gap-4">
                      <div className="col-span-11 md:col-span-5 flex items-center gap-4">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-zinc-900 shadow-lg">
                          {getCoverImageUrl(song.storageKey, "small", true) ? (
                            <img
                              src={
                                getCoverImageUrl(
                                  song.storageKey,
                                  "small",
                                  true,
                                )!
                              }
                              alt={song.title}
                              className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-zinc-700">
                              <Music className="h-5 w-5" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="h-5 w-5 fill-current text-white" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white truncate group-hover:text-primary transition-colors capitalize">
                            {song.title}
                          </h4>
                          <p className="text-xs text-zinc-500 font-medium md:hidden">
                            {song.artistName}
                          </p>
                        </div>
                      </div>

                      <div className="col-span-3 hidden md:block text-zinc-400 text-sm font-medium truncate">
                        {song.artistName}
                      </div>

                      <div className="col-span-2 hidden lg:block text-zinc-500 text-sm italic truncate">
                        {song.genre}
                      </div>

                      <div className="col-span-1 text-right text-zinc-500 text-xs font-bold font-mono tracking-tighter pr-4">
                        {formatDuration(song.durationMs)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </InfiniteScrollContainer>
      </div>
    </div>
  );
}

function PlaylistDetailsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-zinc-900 rounded-full" />
        <div className="h-8 w-48 bg-zinc-900 rounded-lg" />
      </div>
      <div className="h-[350px] w-full bg-zinc-900 rounded-3xl" />
      <div className="space-y-4 pt-6">
        <div className="h-8 w-full bg-zinc-900/50 rounded-xl" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 w-full bg-zinc-900 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
