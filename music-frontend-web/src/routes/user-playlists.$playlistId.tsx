import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Play, Music, ArrowLeft, ListMusic, Trash2 } from "lucide-react";
import { playerActions } from "@/Store/playerStore";
import { mapToPlayerSong, mapListToPlayerSongs } from "@/lib/player-utils";
import { getCoverImageUrl } from "@/lib/s3";
import { toast } from "sonner";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";

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
  const allSongsData = data?.pages.flatMap((page) => page.songs.data) || [];
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
            className="rounded-full hover:bg-zinc-900 border border-white/5"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-400" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-black tracking-tighter text-white">
            {playlist.title}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-red-500/10 hover:text-red-500 border border-transparent transition-all"
          onClick={() => {
            if (confirm("Are you sure you want to delete this playlist?")) {
              deletePlaylistMutation.mutate();
            }
          }}
          disabled={deletePlaylistMutation.isPending}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative flex flex-col md:flex-row gap-8 p-8 rounded-3xl bg-linear-to-br from-zinc-900 via-black to-black border border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
          <div className="h-64 w-64 rounded-full bg-primary blur-3xl" />
        </div>

        {/* Placeholder Cover */}
        <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/50 border border-white/10 mx-auto md:mx-0">
          <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-700">
            <ListMusic className="h-20 w-20" />
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col justify-end gap-4 flex-1">
          <div className="space-y-1">
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl capitalize">
              {playlist.title}
            </h2>
            <p className="text-zinc-400 text-lg font-medium">
              Your personal playlist
            </p>
          </div>

          <div className="flex items-center gap-6 pt-4">
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
                  songs={songs}
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
  songs,
}: {
  song: PlaylistSong;
  index: number;
  playlistId: string;
  songs: PlaylistSong[];
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

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="group grid grid-cols-12 w-full items-center p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5"
      onClick={() => {
        playerActions.setCurrentSong(mapToPlayerSong(song));
        playerActions.setQueue(mapListToPlayerSongs(songs));
      }}
    >
      <div className="col-span-1 text-center text-zinc-600 font-bold text-sm group-hover:text-primary transition-colors">
        {(index + 1).toString().padStart(2, "0")}
      </div>

      <div className="col-span-11 grid grid-cols-11 items-center gap-4">
        <div className="col-span-7 flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-zinc-900 shadow-lg">
            {getCoverImageUrl(song.storageKey, "small", true) ? (
              <img
                src={getCoverImageUrl(song.storageKey, "small", true)!}
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
            <p className="text-xs text-zinc-500 font-medium">
              {song.artistName}
            </p>
          </div>
        </div>

        <div className="col-span-2 text-zinc-400 text-sm font-medium truncate">
          {song.genre}
        </div>

        <div className="col-span-1 text-right text-zinc-500 text-xs font-bold font-mono tracking-tighter pr-4">
          {formatDuration(song.durationMs)}
        </div>

        <div className="col-span-1 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Remove this song from playlist?")) {
                removeSongMutation.mutate();
              }
            }}
            disabled={removeSongMutation.isPending}
          >
            {removeSongMutation.isPending ? (
              <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
