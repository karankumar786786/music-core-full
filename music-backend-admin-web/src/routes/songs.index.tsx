import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  ExternalLink,
  Music2,
  Loader2,
  AlertCircle,
  ListPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getCoverImageUrl } from "@/lib/s3";

export const Route = createFileRoute("/songs/")({
  component: SongsPage,
});

function SongsPage() {
  const queryClient = useQueryClient();
  const [isAddPlaylistDialogOpen, setIsAddPlaylistDialogOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);

  // 1. Processed Songs
  const { data: songs, isLoading: isSongsLoading } = useQuery({
    queryKey: ["songs"],
    queryFn: adminApi.getSongs,
    refetchInterval: 30000, // Poll every 30s
  });

  // 2. Active Processing Jobs
  const { data: jobs, isLoading: isJobsLoading } = useQuery({
    queryKey: ["songs-jobs"],
    queryFn: adminApi.getSongsJobs,
    refetchInterval: 5000, // Poll more frequently for active jobs
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteSong,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast.success("Song deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete song");
    },
  });

  const { data: playlists } = useQuery({
    queryKey: ["playlists"],
    queryFn: adminApi.getPlaylists,
  });

  const addSongMutation = useMutation({
    mutationFn: ({
      playlistId,
      songId,
    }: {
      playlistId: string;
      songId: string;
    }) => adminApi.addSongToPlaylist(playlistId, songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Song added to playlist");
      setIsAddPlaylistDialogOpen(false);
      setSelectedSongId(null);
    },
    onError: () => toast.error("Failed to add song to playlist"),
  });

  if (isSongsLoading && isJobsLoading) return <SongsSkeleton />;

  const activeJobs =
    jobs?.data?.filter(
      (j: any) =>
        j.currentStatus !== "completed" && j.currentStatus !== "failed",
    ) || [];
  const failedJobs =
    jobs?.data?.filter((j: any) => j.currentStatus === "failed") || [];

  const completedSongs =
    songs?.data?.filter(
      (song: any) =>
        !activeJobs.some((job: any) => job.id === song.id) &&
        !failedJobs.some((job: any) => job.id === song.id),
    ) || [];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Songs Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your music, metadata, and HLS streaming assets.
          </p>
        </div>
        <Link to="/songs/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add New Song
          </Button>
        </Link>
      </div>

      {/* Processing Jobs Section (Only shown if there are active or failed jobs) */}
      {(activeJobs.length > 0 || failedJobs.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Processing Pipeline</h2>
            <Badge
              variant="outline"
              className="animate-pulse bg-blue-500/10 text-blue-600 border-blue-200"
            >
              Live
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeJobs.map((job: any) => (
              <div
                key={job.id}
                className="p-4 rounded-xl border bg-card shadow-sm flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {job.currentStatus}...
                  </p>
                </div>
              </div>
            ))}
            {failedJobs.map((job: any) => (
              <div
                key={job.id}
                className="p-4 rounded-xl border border-red-200 bg-red-50 shadow-sm flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-red-900">
                    {job.title}
                  </p>
                  <p className="text-xs text-red-600">Transcoding failed</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Library Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Available Tracks</h2>
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[80px]">Cover</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedSongs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground italic"
                  >
                    No processed songs found.
                  </TableCell>
                </TableRow>
              ) : (
                completedSongs.map((song: any) => (
                  <TableRow
                    key={song.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="h-10 w-10 rounded-md bg-muted overflow-hidden border">
                        {getCoverImageUrl(song.storageKey, "small", true) ? (
                          <img
                            src={
                              getCoverImageUrl(song.storageKey, "small", true)!
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
                    <TableCell className="font-medium">{song.title}</TableCell>
                    <TableCell>{song.artistName}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="font-normal capitalize"
                      >
                        {song.genre || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon" }),
                            "h-8 w-8 cursor-pointer flex items-center justify-center p-0",
                          )}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => {
                              setSelectedSongId(song.id);
                              setIsAddPlaylistDialogOpen(true);
                            }}
                          >
                            <ListPlus className="h-3.5 w-3.5" /> Add to Playlist
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 gap-2 focus:text-red-600 focus:bg-red-50"
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this song?",
                                )
                              ) {
                                deleteMutation.mutate(song.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Song
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={isAddPlaylistDialogOpen}
        onOpenChange={(open) => {
          setIsAddPlaylistDialogOpen(open);
          if (!open) setSelectedSongId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Song to Playlist</DialogTitle>
            <DialogDescription>
              Select a playlist to add this song to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {playlists?.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 italic">
                No playlists available. Create one first.
              </p>
            ) : (
              <div className="grid gap-2">
                {playlists?.data?.map((playlist: any) => (
                  <Button
                    key={playlist.id}
                    variant="outline"
                    className="justify-start gap-4 h-auto p-4"
                    onClick={() => {
                      if (selectedSongId) {
                        addSongMutation.mutate({
                          playlistId: playlist.id,
                          songId: selectedSongId,
                        });
                      }
                    }}
                    disabled={addSongMutation.isPending}
                  >
                    <div className="h-10 w-10 shrink-0 rounded bg-orange-500/10 flex items-center justify-center text-orange-600 font-bold border overflow-hidden">
                      {getCoverImageUrl(playlist.storageKey, "small") ? (
                        <img
                          src={getCoverImageUrl(playlist.storageKey, "small")!}
                          alt={playlist.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        playlist.title?.charAt(0) || "P"
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-1 min-w-0">
                      <span className="font-semibold truncate w-full text-left">
                        {playlist.title}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Add to this playlist
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SongsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="border rounded-xl">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b last:border-0"
          >
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-4 w-[20%]" />
            <Skeleton className="h-4 w-[15%]" />
            <Skeleton className="h-4 w-[10%]" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
