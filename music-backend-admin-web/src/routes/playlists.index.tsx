import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { getCoverImageUrl, getBannerImageUrl } from "@/lib/s3";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoreVertical, Plus, Trash2, Link2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
// Removed ArtistsSkeleton import
import axios from "axios";

export const Route = createFileRoute("/playlists/")({
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const queryClient = useQueryClient();
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);

  // Playlist Creation form state
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [playlistCoverFile, setPlaylistCoverFile] = useState<File | null>(null);
  const [playlistBannerFile, setPlaylistBannerFile] = useState<File | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);

  const { data: playlists, isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: adminApi.getPlaylists,
  });

  const createPlaylistMutation = useMutation({
    mutationFn: adminApi.createPlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Playlist created successfully");
      setIsPlaylistDialogOpen(false);
      setNewPlaylistTitle("");
      setIsUploading(false);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        JSON.stringify(error?.response?.data?.errors) ||
        "Failed to create playlist";
      console.error("Create playlist error:", error?.response?.data);
      toast.error(msg);
      setIsUploading(false);
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: adminApi.deletePlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Playlist deleted successfully");
    },
    onError: () => toast.error("Failed to delete playlist"),
  });

  async function uploadToS3(file: File, fileName: string) {
    const { uploadUrl, key } = await adminApi.getPresignedUrl(
      fileName,
      file.type,
    );
    await axios.put(uploadUrl, file, {
      headers: { "Content-Type": file.type },
    });
    return key;
  }

  const handleCreatePlaylist = async () => {
    if (
      !newPlaylistTitle ||
      !newPlaylistDescription ||
      !playlistCoverFile ||
      !playlistBannerFile
    ) {
      toast.error("Please fill all playlist fields and select both images");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Uploading playlist assets...");

    try {
      const coverKey = await uploadToS3(
        playlistCoverFile,
        playlistCoverFile.name,
      );
      const bannerKey = await uploadToS3(
        playlistBannerFile,
        playlistBannerFile.name,
      );

      createPlaylistMutation.mutate({
        title: newPlaylistTitle,
        description: newPlaylistDescription.padEnd(8, " "),
        tempCoverImageKey: coverKey,
        tempBannerImageKey: bannerKey,
      });
      toast.dismiss(toastId);
    } catch (error) {
      console.error("Playlist upload error:", error);
      toast.error("Failed to upload playlist images", { id: toastId });
      setIsUploading(false);
    }
  };

  if (isLoading) return <ArtistsSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playlists</h1>
          <p className="text-muted-foreground mt-1">
            Manage your curated user playlists.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsPlaylistDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Create Playlist
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {playlists?.data?.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-dashed bg-muted/20">
              <CardContent className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                <Link2 className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm italic">No playlists found</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          playlists?.data?.map((playlist: any) => (
            <Card
              key={playlist.id}
              className="shadow-sm border-muted/60 hover:border-primary/20 transition-colors group cursor-pointer h-full"
            >
              <CardContent className="p-0">
                <Link
                  to="/playlists/$playlistId"
                  params={{ playlistId: playlist.id }}
                >
                  <div className="relative aspect-[3/1] bg-muted overflow-hidden rounded-t-lg">
                    {getBannerImageUrl(playlist.storageKey, "medium") ? (
                      <img
                        src={getBannerImageUrl(playlist.storageKey, "medium")!}
                        alt={playlist.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-orange-500/20" />
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex shrink-0 items-center justify-center text-orange-600 font-bold border overflow-hidden -mt-8 relative z-10 shadow-sm border-background">
                        {getCoverImageUrl(playlist.storageKey, "small") ? (
                          <img
                            src={
                              getCoverImageUrl(playlist.storageKey, "small")!
                            }
                            alt={playlist.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          playlist.title?.charAt(0) || "P"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">
                          {playlist.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Public Playlist
                        </p>
                      </div>
                    </div>

                    <div onClick={(e) => e.preventDefault()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="gap-2 text-red-600"
                            onClick={(e) => {
                              e.preventDefault();
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this playlist?",
                                )
                              ) {
                                deletePlaylistMutation.mutate(playlist.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Playlist
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Playlist Dialog */}
      <Dialog
        open={isPlaylistDialogOpen}
        onOpenChange={setIsPlaylistDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>
              Create a curated collection of songs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="playlist-title">Playlist Title</Label>
              <Input
                id="playlist-title"
                placeholder="Top Hits 2024"
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-desc">Description</Label>
              <Textarea
                id="playlist-desc"
                placeholder="Playlist description..."
                value={newPlaylistDescription}
                onChange={(e: any) => setNewPlaylistDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-cover">Cover Image (Thumbnail)</Label>
              <Input
                id="playlist-cover"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setPlaylistCoverFile(e.target.files?.[0] || null)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-banner">Banner Image (Hero)</Label>
              <Input
                id="playlist-banner"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setPlaylistBannerFile(e.target.files?.[0] || null)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPlaylistDialogOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              disabled={isUploading || createPlaylistMutation.isPending}
            >
              {isUploading ? "Uploading..." : "Create Playlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArtistsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-10 w-64 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-40 w-full bg-muted animate-pulse rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
