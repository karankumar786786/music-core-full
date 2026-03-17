import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useState, useMemo } from "react";
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
  Edit,
  ExternalLink,
  Music2,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getCoverImageUrl } from "@/lib/s3";
import { Input } from "@/components/ui/input";
import { InfiniteScrollContainer } from "@/components/custom/InfiniteScrollContainer";
import { SongActions } from "@/components/custom/SongActions";

export const Route = createFileRoute("/songs/")({
  component: SongsPage,
});

function SongsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Paginated Songs with Infinite Scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isSongsLoading,
  } = useInfiniteQuery({
    queryKey: ["songs"],
    queryFn: ({ pageParam = 1 }) =>
      adminApi.getSongs({ page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage, allPages) => {
      // If the current page has fewer than 20 items, there are no more pages
      if (lastPage.data.length < 20) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
  });

  // Flatten the pages into a single array of songs
  const allSongs = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  // 2. Active Processing Jobs
  const { data: jobs, isLoading: isJobsLoading } = useQuery({
    queryKey: ["songs-jobs"],
    queryFn: adminApi.getSongsJobs,
    refetchInterval: 5000, // Poll more frequently for active jobs
  });

  if (isSongsLoading && isJobsLoading) return <SongsSkeleton />;

  const activeJobs =
    jobs?.data?.filter(
      (j: any) =>
        j.currentStatus !== "completed" && j.currentStatus !== "failed",
    ) || [];
  const failedJobs =
    jobs?.data?.filter((j: any) => j.currentStatus === "failed") || [];

  // Filter songs based on search query
  const filteredSongs = allSongs.filter((song: any) => {
    const query = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(query) ||
      song.artistName.toLowerCase().includes(query) ||
      (song.genre && song.genre.toLowerCase().includes(query))
    );
  });

  const completedSongs = filteredSongs.filter(
    (song: any) =>
      !activeJobs.some((job: any) => job.id === song.id) &&
      !failedJobs.some((job: any) => job.id === song.id),
  );

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

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search songs, artists, genres..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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
          <InfiniteScrollContainer
            fetchNextPage={fetchNextPage}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          >
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
                      {searchQuery
                        ? "No matching songs found."
                        : "No processed songs found."}
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
                      <TableCell className="font-medium">
                        {song.title}
                      </TableCell>
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
                        <SongActions song={song} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </InfiniteScrollContainer>
        </div>
      </div>
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
