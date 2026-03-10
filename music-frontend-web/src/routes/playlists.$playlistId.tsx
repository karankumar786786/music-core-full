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
        if (!lastPage?.songs?.data || lastPage.songs.data.length < 50)
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
            className="rounded-full hover:bg-white/5 border border-white/5 group h-10 w-10 transition-all duration-300 active:scale-90"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-400 group-hover:text-primary transition-colors" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white capitalize text-glow-green">
            {playlist.title}
          </h1>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative flex flex-col md:flex-row gap-10 p-12 rounded-[40px] glass-effect border border-white/10 overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity duration-1000 pointer-events-none">
          <div className="h-64 w-64 rounded-full bg-primary blur-[120px] animate-pulse" />
        </div>

        {/* Cover Image */}
        <div className="relative h-64 w-64 shrink-0 overflow-hidden rounded-3xl shadow-2xl border-8 border-black group-hover:scale-[1.02] transition-transform duration-700 mx-auto md:mx-0">
          {getCoverImageUrl(playlist.storageKey, "medium") ? (
            <img
              src={getCoverImageUrl(playlist.storageKey, "medium")!}
              alt={playlist.title}
              className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-700">
              <ListMusic className="h-20 w-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Info */}
        <div className="flex flex-col justify-end gap-6 flex-1">
          <div className="space-y-2">
            <Badge className="glass-effect  border-primary/30 px-4 py-1.5 mb-2 font-bold uppercase text-[10px] tracking-widest w-fit">
              Public Playlist
            </Badge>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-2xl capitalize">
              {playlist.title}
            </h2>
            <p className="text-zinc-500 text-lg font-bold max-w-2xl leading-relaxed">
              {playlist.description ||
                "A curated collection of tracks for your listening pleasure."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4">
            <Button
              size="lg"
              className="rounded-full px-10 h-14 font-black gap-3 bg-primary text-black hover:bg-white/90 shadow-2xl shadow-black/50 hover:scale-105 active:scale-95 transition-all duration-300"
              disabled={songs.length === 0}
              onClick={() => {
                if (songs.length > 0) {
                  playerActions.playAll(mapListToPlayerSongs(songs));
                }
              }}
            >
              <Play className="h-6 w-6 fill-current" /> Play Now
            </Button>

            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 glass-effect px-6 py-3 rounded-2xl">
              <span className="flex items-center gap-2">
                <Music className="h-4 w-4 text-primary" />
                {playlist?.songs?.meta?.totalItems ||
                  (songs && songs.length) ||
                  0}{" "}
                Songs
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
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
                    className="group flex items-center gap-4 p-4 rounded-3xl hover:bg-white/5 transition-all duration-300 cursor-pointer border border-transparent hover:border-white/5 active:scale-[0.99] glass-effect-hover"
                    onClick={() => {
                      playerActions.playSong(mapToPlayerSong(song));
                    }}
                  >
                    <div className="w-10 text-center text-zinc-600 font-black text-xs group-hover:text-primary transition-colors font-mono">
                      {(index + 1).toString().padStart(2, "0")}
                    </div>

                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/5 shadow-2xl group-hover:border-primary/20 transition-colors">
                      {getCoverImageUrl(song.storageKey, "small", true) ? (
                        <img
                          src={
                            getCoverImageUrl(song.storageKey, "small", true)!
                          }
                          alt={song.title}
                          className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-zinc-900 border border-white/10 text-zinc-700">
                          <Music className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                        <Play className="h-6 w-6 fill-current text-white transform scale-90 group-hover:scale-100 transition-transform" />
                      </div>
                    </div>

                    <div className="flex flex-col min-w-0 flex-1 gap-1">
                      <h4 className="font-bold text-white truncate group-hover:text-primary transition-colors text-base tracking-tight text-glow-green capitalize">
                        {song.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest truncate">
                          {song.artistName}
                        </p>
                        <span className="w-1 h-1 rounded-full bg-zinc-800" />
                        <p className="text-xs text-zinc-600 font-medium truncate italic">
                          {song.genre}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <div className="text-right text-zinc-500 text-xs font-black font-mono tracking-tighter pr-2">
                        {formatDuration(song.durationMs)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full text-zinc-400 hover:text-primary hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20 shadow-2xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          playerActions.playSong(mapToPlayerSong(song));
                        }}
                      >
                        <Play className="h-6 w-6 fill-current" />
                      </Button>
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
