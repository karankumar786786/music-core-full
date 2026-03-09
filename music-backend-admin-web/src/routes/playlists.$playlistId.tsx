import { createFileRoute } from "@tanstack/react-router";
import { useParams, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";
import { getCoverImageUrl, getBannerImageUrl } from "@/lib/s3";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Music2, ArrowLeft, Calendar, Clock } from "lucide-react";
// Removed ArtistsSkeleton import

export const Route = createFileRoute("/playlists/$playlistId")({
  component: PlaylistDetailsPage,
});

function PlaylistDetailsPage() {
  const { playlistId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: () => adminApi.getPlaylist(playlistId),
  });

  const playlist = response;

  const removeSongMutation = useMutation({
    mutationFn: (songId: string) =>
      adminApi.removeSongFromPlaylist(playlistId, songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      toast.success("Song removed from playlist");
    },
    onError: () => toast.error("Failed to remove song"),
  });

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

  if (isLoading) return <ArtistsSkeleton />;
  if (!playlist) return <div>Playlist not found</div>;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center gap-4">
        <Link to="/playlists">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {playlist.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {playlist.description || "Manage songs in this playlist"}
          </p>
        </div>
      </div>

      <div className="relative aspect-[4/1] md:aspect-[5/1] bg-muted overflow-hidden rounded-xl border shadow-sm">
        {getBannerImageUrl(playlist.storageKey, "large") ? (
          <img
            src={getBannerImageUrl(playlist.storageKey, "large")!}
            alt={playlist.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-orange-500/10 flex items-center justify-center text-orange-500/50">
            <Music2 className="h-24 w-24" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute bottom-6 left-6 flex items-end gap-6">
          <div className="h-32 w-32 rounded-xl bg-background flex shrink-0 items-center justify-center text-orange-600 font-bold border shadow-lg overflow-hidden relative z-10">
            {getCoverImageUrl(playlist.storageKey, "large") ? (
              <img
                src={getCoverImageUrl(playlist.storageKey, "large")!}
                alt={playlist.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-5xl">
                {playlist.title?.charAt(0) || "P"}
              </span>
            )}
          </div>
          <div className="hidden sm:block pb-2">
            <h2 className="text-4xl font-bold text-foreground drop-shadow-sm">
              {playlist.title}
            </h2>
            <p className="text-muted-foreground font-medium mt-1">
              Playlist • {playlist.songs?.data?.length || 0} songs
            </p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-muted/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[60px]"></TableHead>
                <TableHead>Song Details</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Released</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playlist.songs?.data?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Music2 className="h-8 w-8 opacity-50" />
                      <p>No songs in this playlist yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                playlist.songs?.data?.map((item: any) => {
                  const song = item.song;
                  if (!song) return null;

                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell>
                        <div className="h-10 w-10 rounded-md bg-muted overflow-hidden border">
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
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                              <Music2 className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{song.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {song.artistName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {song.genre}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(song.releaseDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 text-muted-foreground text-sm font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(song.durationMs)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to remove ${song.title} from this playlist?`,
                              )
                            ) {
                              removeSongMutation.mutate(song.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ArtistsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-10 w-64 bg-muted animate-pulse rounded" />
      <div className="h-[400px] w-full bg-muted animate-pulse rounded-xl" />
    </div>
  );
}
