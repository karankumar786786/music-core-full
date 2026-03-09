import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import axios from "axios";
import { getCoverImageUrl } from "@/lib/s3";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, UserSquare2, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/artists/")({
  component: ArtistsPage,
});

function ArtistsPage() {
  const queryClient = useQueryClient();
  const [isArtistDialogOpen, setIsArtistDialogOpen] = useState(false);

  // Artist Form State
  const [newArtistName, setNewArtistName] = useState("");
  const [newArtistBio, setNewArtistBio] = useState("");
  const [newArtistDob, setNewArtistDob] = useState("");
  const [artistCoverFile, setArtistCoverFile] = useState<File | null>(null);
  const [artistBannerFile, setArtistBannerFile] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  const { data: artists, isLoading } = useQuery({
    queryKey: ["artists"],
    queryFn: adminApi.getArtists,
  });

  const createArtistMutation = useMutation({
    mutationFn: adminApi.createArtist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artists"] });
      toast.success("Artist created successfully");
      setIsArtistDialogOpen(false);
      setNewArtistName("");
      setIsUploading(false);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        JSON.stringify(error?.response?.data?.errors) ||
        "Failed to create artist";
      console.error("Create artist error:", error?.response?.data);
      toast.error(msg);
      setIsUploading(false);
    },
  });

  const deleteArtistMutation = useMutation({
    mutationFn: adminApi.deleteArtist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artists"] });
      toast.success("Artist deleted successfully");
    },
    onError: () => toast.error("Failed to delete artist"),
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

  const handleCreateArtist = async () => {
    if (
      !newArtistName ||
      !newArtistBio ||
      !newArtistDob ||
      !artistCoverFile ||
      !artistBannerFile
    ) {
      toast.error("Please fill all artist fields and select both images");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Uploading artist assets...");

    try {
      const coverKey = await uploadToS3(artistCoverFile, artistCoverFile.name);
      const bannerKey = await uploadToS3(
        artistBannerFile,
        artistBannerFile.name,
      );

      createArtistMutation.mutate({
        name: newArtistName,
        bio: newArtistBio,
        dob: new Date(newArtistDob).toISOString(),
        tempCoverImageKey: coverKey,
        tempBannerImageKey: bannerKey,
      });
      toast.dismiss(toastId);
    } catch (error) {
      console.error("Artist upload error:", error);
      toast.error("Failed to upload artist images", { id: toastId });
      setIsUploading(false);
    }
  };

  if (isLoading) return <ArtistsSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artists</h1>
          <p className="text-muted-foreground mt-1">
            Manage artist profiles in the system.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsArtistDialogOpen(true)}>
          <Plus className="h-4 w-4" /> New Artist
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {artists?.data?.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-dashed bg-muted/20">
              <CardContent className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                <UserSquare2 className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm italic">No artists found</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          artists?.data?.map((artist: any) => (
            <Card
              key={artist.id}
              className="shadow-sm border-muted/60 hover:border-primary/20 transition-colors group relative"
            >
              <Link
                to="/artists/$artistId"
                params={{ artistId: artist.id }}
                className="flex flex-col items-center gap-4 text-center w-full"
              >
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border mt-2 shadow-sm">
                  {getCoverImageUrl(artist.storageKey, "small") ? (
                    <img
                      src={getCoverImageUrl(artist.storageKey, "small")!}
                      alt={artist.artistName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    artist.artistName?.charAt(0)
                  )}
                </div>
                <div>
                  <p className="font-semibold capitalize">
                    {artist.artistName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Artist Profile
                  </p>
                </div>
              </Link>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isArtistDialogOpen} onOpenChange={setIsArtistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Artist</DialogTitle>
            <DialogDescription>
              Add a new artist profile to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="artist-name">Artist Name</Label>
              <Input
                id="artist-name"
                placeholder="e.g. Daft Punk"
                value={newArtistName}
                onChange={(e) => setNewArtistName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist-bio">Bio</Label>
              <Input
                id="artist-bio"
                placeholder="Brief biography..."
                value={newArtistBio}
                onChange={(e) => setNewArtistBio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist-dob">Date of Birth</Label>
              <Input
                id="artist-dob"
                type="date"
                value={newArtistDob}
                onChange={(e) => setNewArtistDob(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setArtistCoverFile(e.target.files?.[0] || null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Banner Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setArtistBannerFile(e.target.files?.[0] || null)
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsArtistDialogOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateArtist}
              disabled={isUploading || createArtistMutation.isPending}
            >
              {isUploading ? "Uploading..." : "Create Artist"}
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
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
