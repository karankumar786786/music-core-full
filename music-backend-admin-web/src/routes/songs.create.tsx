import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  ChevronLeft,
  Loader2,
  UploadCloud,
  Music,
  ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

const songSchema = zodResolver(
  z.object({
    title: z.string().min(1, "Title is required"),
    artistName: z.string().min(1, "Artist name is required"),
    albumName: z.string().optional(),
    genre: z.string().min(1, "Genre is required"),
    releaseYear: z.string().regex(/^\d{4}$/, "Must be a 4-digit year"),
    isrc: z.string().min(1, "ISRC is required"),
  }),
);

export const Route = createFileRoute("/songs/create")({
  component: CreateSongPage,
});

function CreateSongPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [durationMs, setDurationMs] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm({
    resolver: songSchema,
    defaultValues: {
      title: "",
      artistName: "",
      albumName: "",
      genre: "",
      releaseYear: new Date().getFullYear().toString(),
      isrc: "",
    },
  });

  const mutation = useMutation({
    mutationFn: adminApi.createSong,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast.success("Song created and queued for processing");
      navigate({ to: "/songs" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create song");
      setIsUploading(false);
    },
  });

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);

      // Auto-populate title if it's empty
      if (!form.getValues("title")) {
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        form.setValue("title", fileNameWithoutExt);
      }

      // Extract duration
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        setDurationMs(Math.round(audio.duration * 1000));
        URL.revokeObjectURL(audio.src);
      };
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  async function uploadToS3(file: File, fileName: string) {
    // 1. Get presigned URL
    const { uploadUrl, key } = await adminApi.getPresignedUrl(
      fileName,
      file.type,
    );

    // 2. Upload file
    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
    });

    return key;
  }

  async function onSubmit(values: any) {
    if (!audioFile || !imageFile) {
      toast.error("Please select both audio and cover image files");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Uploading files to cloud storage...");

    try {
      // 1. Upload Audio
      const audioKey = await uploadToS3(audioFile, audioFile.name);
      toast.loading("Audio uploaded. Uploading cover image...", {
        id: toastId,
      });

      // 2. Upload Image
      const imageKey = await uploadToS3(imageFile, imageFile.name);

      toast.loading("Files uploaded. Finalizing metadata...", { id: toastId });

      // 3. Create Song in Backend
      const payload = {
        title: values.title,
        artistName: values.artistName,
        durationMs: durationMs || 180000, // Fallback to 3 mins if duration failed
        releaseDate: new Date(`${values.releaseYear}-01-01`).toISOString(),
        isrc: values.isrc,
        genre: values.genre,
        tempSongKey: audioKey,
        tempSongImageKey: imageKey,
      };

      mutation.mutate(payload);
      toast.dismiss(toastId);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files. Please try again.", { id: toastId });
      setIsUploading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/songs" })}
          disabled={isUploading}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Song</h1>
          <p className="text-muted-foreground">
            Add a new track to your library (HLS Transcoding active).
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Metadata Information</CardTitle>
              <CardDescription>
                Provide the industry metadata for this track.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Song Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Midnight City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="artistName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artist Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. M83" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Genre</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Synthwave" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="releaseYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Release Year</FormLabel>
                      <FormControl>
                        <Input placeholder="2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isrc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ISRC Code</FormLabel>
                      <FormControl>
                        <Input placeholder="US-RC1-23-45678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Audio Track</CardTitle>
                <CardDescription>High-quality source file.</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioChange}
                  className="hidden"
                  ref={audioInputRef}
                />
                <div
                  onClick={() => audioInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                    audioFile
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-muted-foreground/20 hover:bg-muted/50",
                  )}
                >
                  {audioFile ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                      <p className="text-sm font-medium truncate max-w-full italic">
                        {audioFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Music className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Select Audio</p>
                      <p className="text-xs text-muted-foreground">
                        WAV, FLAC, MP3
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Cover Image</CardTitle>
                <CardDescription>Artwork for the song.</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  ref={imageInputRef}
                />
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                    imageFile
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-muted-foreground/20 hover:bg-muted/50",
                  )}
                >
                  {imageFile ? (
                    <>
                      <div className="relative h-16 w-16 mb-2 rounded-md overflow-hidden border shadow-sm">
                        <img
                          src={URL.createObjectURL(imageFile)}
                          alt="preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="text-sm font-medium truncate max-w-full italic">
                        {imageFile.name}
                      </p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Select Artwork</p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG (1:1 recommended)
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate({ to: "/songs" })}
              disabled={isUploading || mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || mutation.isPending}
              className="min-w-[140px]"
            >
              {isUploading || mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Processing...
                </>
              ) : (
                "Upload & Create"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
