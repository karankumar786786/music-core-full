import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Trash2, ListPlus, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCoverImageUrl } from "@/lib/s3";

interface SongActionsProps {
  song: {
    id: string;
    title: string;
  };
  variant?: "ghost" | "outline" | "default";
  size?: "icon" | "sm" | "default";
  className?: string;
}

export function SongActions({
  song,
  variant = "ghost",
  size = "icon",
  className,
}: SongActionsProps) {
  const queryClient = useQueryClient();
  const [isAddPlaylistDialogOpen, setIsAddPlaylistDialogOpen] = useState(false);

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
    },
    onError: () => toast.error("Failed to add song to playlist"),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          className={cn(
            buttonVariants({ variant, size }),
            "cursor-pointer flex items-center justify-center p-0",
            className,
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsAddPlaylistDialogOpen(true);
            }}
          >
            <ListPlus className="h-3.5 w-3.5" /> Add to Playlist
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 gap-2 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Are you sure you want to delete this song?")) {
                deleteMutation.mutate(song.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Song
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={isAddPlaylistDialogOpen}
        onOpenChange={(open) => {
          setIsAddPlaylistDialogOpen(open);
        }}
      >
        <DialogContent
          className="max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Add Song to Playlist</DialogTitle>
            <DialogDescription>
              Select a playlist to add "{song.title}" to.
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
                      addSongMutation.mutate({
                        playlistId: playlist.id,
                        songId: song.id,
                      });
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
    </>
  );
}
