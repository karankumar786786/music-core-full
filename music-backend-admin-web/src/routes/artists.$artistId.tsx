import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
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
import { Music2, ArrowLeft, Calendar, Clock, User2 } from "lucide-react";

export const Route = createFileRoute("/artists/$artistId")({
  component: ArtistDetailsPage,
});

function ArtistDetailsPage() {
  const { artistId } = Route.useParams();

  const { data: artist, isLoading: isArtistLoading } = useQuery({
    queryKey: ["artist", artistId],
    queryFn: () => adminApi.getArtist(artistId),
  });

  const { data: songsResponse, isLoading: isSongsLoading } = useQuery({
    queryKey: ["artist-songs", artistId],
    queryFn: () => adminApi.getArtistSongs(artistId),
  });

  const songs = songsResponse?.data || [];

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

  if (isArtistLoading || isSongsLoading) return <ArtistDetailsSkeleton />;
  if (!artist) return <div className="p-8 text-center">Artist not found</div>;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center gap-4">
        <Link to="/artists">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight capitalize">
            {artist.artistName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {artist.bio || "Artist Profile & Tracks"}
          </p>
        </div>
      </div>

      <div className="relative aspect-[4/1] md:aspect-[5/1] bg-muted overflow-hidden rounded-xl border shadow-sm">
        {getBannerImageUrl(artist.storageKey, "large") ? (
          <img
            src={getBannerImageUrl(artist.storageKey, "large")!}
            alt={artist.artistName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-primary/5 flex items-center justify-center text-primary/20">
            <User2 className="h-24 w-24" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute bottom-6 left-6 flex items-end gap-6 text-foreground">
          <div className="h-32 w-32 rounded-xl bg-background flex shrink-0 items-center justify-center text-primary font-bold border shadow-lg overflow-hidden relative z-10">
            {getCoverImageUrl(artist.storageKey, "large") ? (
              <img
                src={getCoverImageUrl(artist.storageKey, "large")!}
                alt={artist.artistName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-5xl uppercase">
                {artist.artistName?.charAt(0) || "A"}
              </span>
            )}
          </div>
          <div className="hidden sm:block pb-2">
            <h2 className="text-4xl font-bold drop-shadow-sm capitalize">
              {artist.artistName}
            </h2>
            <p className="text-muted-foreground font-medium mt-1">
              Artist • {songs.length} tracks in library
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold px-1">Library Tracks</h3>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {songs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Music2 className="h-8 w-8 opacity-50" />
                        <p>No songs found for this artist</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  songs.map((song: any) => (
                    <TableRow
                      key={song.id}
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
                          <span className="font-medium capitalize">
                            {song.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {song.isrc}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary capitalize">
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ArtistDetailsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-10 w-64 bg-muted rounded" />
      <div className="h-48 w-full bg-muted rounded-xl" />
      <div className="space-y-4">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-64 w-full bg-muted rounded-xl" />
      </div>
    </div>
  );
}
