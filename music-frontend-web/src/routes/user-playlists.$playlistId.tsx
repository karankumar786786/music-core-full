import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Music, ArrowLeft, ListMusic, Trash2 } from "lucide-react";
import { playerActions } from "@/Store/playerStore";
import { mapToPlayerSong, mapListToPlayerSongs } from "@/lib/player-utils";
import { getCoverImageUrl } from "@/lib/s3";
import { toast } from "sonner";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";
import { capitalize } from "@/lib/utils";

export const Route = createFileRoute("/user-playlists/$playlistId")({
  component: UserPlaylistDetailsPage,
});

function UserPlaylistDetailsPage() {
  const { playlistId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["userPlaylist", playlistId],
      queryFn: ({ pageParam = 1 }) =>
        musicApi.getUserPlaylist(playlistId, pageParam, 50),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (!lastPage?.songs?.data || lastPage.songs.data.length < 50)
          return undefined;
        return lastPage.songs.meta.page + 1;
      },
    });

  const deletePlaylistMutation = useMutation({
    mutationFn: () => musicApi.deleteUserPlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
      toast.success("Playlist deleted");
      navigate({ to: "/", search: { tab: "playlist" } });
    },
    onError: () => {
      toast.error("Failed to delete playlist");
    },
  });

  const playlist = data?.pages[0];
  const allSongsData =
    data?.pages.flatMap((page) => page.songs?.data || []) || [];
  const songs = allSongsData
    .map(
      (item: {
        song: {
          id: string;
          title: string;
          storageKey: string;
          artistName: string;
          genre: string;
          durationMs: number;
        };
      }) => item.song,
    )
    .filter(Boolean);

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
        <div className="flex-1">
          <h1 className="text-3xl font-black tracking-tighter text-white capitalize text-glow-green">
            {playlist.title}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-zinc-500 hover:bg-red-500/10 hover:text-red-500 border border-white/5 hover:border-red-500/20 transition-all h-10 w-10 active:scale-95"
          onClick={() => {
            deletePlaylistMutation.mutate();
          }}
          disabled={deletePlaylistMutation.isPending}
          title="Delete Playlist"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative flex flex-col md:flex-row gap-10 p-12 rounded-[40px] glass-effect border border-white/10 overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity duration-1000 pointer-events-none">
          <div className="h-64 w-64 rounded-full bg-primary blur-[120px] animate-pulse" />
        </div>

        {/* Placeholder Cover */}
        <div className="relative h-64 w-64 shrink-0 overflow-hidden rounded-3xl shadow-2xl border-8 border-black group-hover:scale-[1.02] transition-transform duration-700 mx-auto md:mx-0 flex items-center justify-center bg-primary">
          <ListMusic className="h-24 w-24 text-black" />
          <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Info */}
        <div className="flex flex-col justify-end gap-6 flex-1">
          <div className="space-y-2">
            <Badge className="glass-effect  border-primary/30 px-4 py-1.5 mb-2 font-bold uppercase text-[10px] tracking-widest w-fit">
              My Playlist
            </Badge>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl  capitalize">
              {capitalize(playlist.title)}
            </h2>
            <p className="text-zinc-500 text-lg font-bold">
              Your personal curated collection
            </p>
          </div>

          <div className="flex items-center gap-6 pt-4">
            <Button
              size="lg"
              className="rounded-full px-5 h-10 font-black gap-3 bg-primary text-black hover:bg-white/90 shadow-2xl shadow-black/50 hover:scale-105 active:scale-95 transition-all duration-300"
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
            </div>
          </div>
        </div>
      </div>

      {/* Tracks Section */}
      <div className="space-y-6 pt-4">
        {songs.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl bg-zinc-900/30">
            <Music className="h-12 w-12 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium italic">
              This playlist is currently empty.
            </p>
          </div>
        ) : (
          <InfiniteScrollContainer
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          >
            <div className="flex flex-col gap-1">
              {songs.map((song: PlaylistSong, index: number) => (
                <PlaylistSongRow
                  key={song.id}
                  song={song}
                  index={index}
                  playlistId={playlistId}
                />
              ))}
            </div>
          </InfiniteScrollContainer>
        )}
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
      <div className="h-[250px] w-full bg-zinc-900 rounded-3xl" />
      <div className="space-y-4 pt-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 w-full bg-zinc-900 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

interface PlaylistSong {
  id: string;
  title: string;
  storageKey: string;
  artistName: string;
  genre: string;
  durationMs: number;
}

function PlaylistSongRow({
  song,
  index,
  playlistId,
}: {
  song: PlaylistSong;
  index: number;
  playlistId: string;
}) {
  const queryClient = useQueryClient();
  const removeSongMutation = useMutation({
    mutationFn: () => musicApi.removeSongFromUserPlaylist(playlistId, song.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlaylist", playlistId] });
      toast.success("Song removed from playlist");
    },
    onError: () => {
      toast.error("Failed to remove song from playlist");
    },
  });

  return (
    <div
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
            src={getCoverImageUrl(song.storageKey, "small", true)!}
            alt={song.title}
            className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-zinc-900 border border-white/10">
            <Music className="h-8 w-8 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
          <Play className="h-6 w-6 fill-current text-white transform scale-90 group-hover:scale-100 transition-transform" />
        </div>
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors text-base tracking-tight ">
          {capitalize(song.title)}
        </h3>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest truncate">
          {capitalize(song.artistName)}
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-zinc-400 group-hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
            onClick={() => {
              if (confirm("Remove this song from playlist?")) {
                removeSongMutation.mutate();
              }
            }}
            disabled={removeSongMutation.isPending}
            title="Remove from playlist"
          >
            {removeSongMutation.isPending ? (
              <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>

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
    </div>
  );
}
