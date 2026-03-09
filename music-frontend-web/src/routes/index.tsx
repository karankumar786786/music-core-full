import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Play, ListMusic, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const homeSearchSchema = z.object({
  tab: z
    .enum(["home", "artist", "playlist", "favourites", "history"])
    .catch("home")
    .optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: (search) => homeSearchSchema.parse(search),
  component: HomeComponent,
});

function HomeComponent() {
  const { tab = "home" } = Route.useSearch();

  switch (tab) {
    case "artist":
      return <ArtistsView />;
    case "playlist":
      return <PlaylistsView />;
    case "home":
    default:
      return <HomeFeed />;
  }
}

function HomeFeed() {
  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative h-[350px] overflow-hidden rounded-3xl bg-linear-to-br from-primary/20 via-black to-black border border-white/5 p-10 flex flex-col justify-end">
        <div className="absolute top-0 right-0 p-10 opacity-20">
          <div className="h-64 w-64 rounded-full bg-primary blur-3xl" />
        </div>
        <Badge className="mb-4 w-fit bg-primary/20  border-primary/20 px-3 py-1">
          New Release
        </Badge>
        <h1 className="text-6xl font-black tracking-tighter text-white mb-4">
          Midnight City
        </h1>
        <p className="max-w-md text-zinc-400 text-lg mb-8 italic">
          Experience the ultimate synthwave journey through the neon-lit streets
          of 1984.
        </p>
        <div className="flex gap-4">
          <Button
            size="lg"
            className="rounded-full px-8 font-bold gap-2 bg-primary hover:bg-primary/90"
          >
            <Play className="h-5 w-5 fill-current" /> Play Now
          </Button>
        </div>
      </section>

      {/* Personalized Feed Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Personalized Feed
          </h2>
          <Button
            variant="link"
            className="text-primary hover:text-primary/80 font-semibold p-0"
          >
            View all
          </Button>
        </div>
        <div className="flex flex-row overflow-x-auto gap-6 pb-4 no-scrollbar">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="flex-none w-[160px] group relative space-y-3 cursor-pointer"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-900 border border-white/5">
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-primary hover:scale-110 transition-transform shadow-xl"
                  >
                    <Play className="h-5 w-5 fill-current text-white" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-white truncate group-hover:text-primary transition-colors text-sm">
                  Ocean Vibes {i}
                </h3>
                <p className="text-[10px] text-zinc-500 truncate">
                  Lofi Girl, Chillhop Music
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Artists Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Top Artists
          </h2>
          <Button
            variant="link"
            className="text-primary hover:text-primary/80 font-semibold p-0"
          >
            Explore
          </Button>
        </div>
        <div className="flex flex-row overflow-x-auto gap-6 pb-4 no-scrollbar">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="flex-none w-[128px] group relative space-y-3 cursor-pointer text-center"
            >
              <div className="relative aspect-square overflow-hidden rounded-full bg-zinc-900 border border-white/5 mx-auto">
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-6 w-6 fill-current text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-white truncate group-hover:text-primary transition-colors text-sm">
                  Artist Name {i}
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  Artist
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Now Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Trending Now
          </h2>
        </div>
        <div className="flex flex-row overflow-x-auto gap-6 pb-4 no-scrollbar">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex-none w-[160px] space-y-3">
              <Skeleton className="aspect-square w-full rounded-2xl bg-zinc-900" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-3/4 bg-zinc-900" />
                <Skeleton className="h-2 w-1/2 bg-zinc-900" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ArtistsView() {
  const { data, isLoading } = useQuery({
    queryKey: ["artists"],
    queryFn: () => musicApi.getArtists(),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          Artists
        </h1>
        <p className="text-zinc-500">Discover your favorite artists</p>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 p-4">
                <Skeleton className="h-20 w-20 rounded-full bg-zinc-900" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-1/4 bg-zinc-900" />
                  <Skeleton className="h-4 w-1/2 bg-zinc-900" />
                </div>
              </div>
            ))
          : data?.data?.map((artist: any) => (
              <Link
                key={artist.id}
                to="/artists/$artistId"
                params={{ artistId: artist.id }}
                className="group flex items-center gap-6 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-900 group-hover:ring-primary/50 transition-all">
                  {artist.coverImage ? (
                    <img
                      src={artist.coverImage}
                      alt={artist.artistName}
                      className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-2xl font-bold">
                      {artist.artistName?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white tracking-tight group-hover:text-primary transition-colors">
                      {artist.artistName}
                    </h2>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-widest bg-zinc-900 text-zinc-500 border-zinc-800"
                    >
                      Artist
                    </Badge>
                  </div>
                  <p className="text-zinc-400 text-sm line-clamp-1 max-w-2xl font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                    {artist.bio || "No bio available for this artist."}
                  </p>
                </div>

                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 p-2 text-zinc-500 hover:text-white">
                  <ChevronRight className="w-6 h-6" />
                </div>
              </Link>
            ))}
      </div>
      {!isLoading && (!data?.data || data.data.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">No artists found</p>
        </div>
      )}
    </div>
  );
}

function PlaylistsView() {
  const { data, isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: () => musicApi.getPlaylists(),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          Playlists
        </h1>
        <p className="text-zinc-500">Hand-picked collections for you</p>
      </div>

      <div className="flex flex-col">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-6 p-5 border-b border-zinc-900/50"
              >
                <Skeleton className="h-20 w-20 rounded-lg bg-zinc-900" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-1/3 bg-zinc-900" />
                  <Skeleton className="h-4 w-1/2 bg-zinc-900" />
                </div>
              </div>
            ))
          : data?.data?.map((playlist: any) => (
              <Link
                key={playlist.id}
                to="/playlists/$playlistId"
                params={{ playlistId: playlist.id }}
                className="group flex items-center justify-between p-5 rounded-2xl hover:bg-zinc-800/50 transition-all duration-200 cursor-pointer border-b border-zinc-900/50"
              >
                <div className="flex items-center gap-6 flex-1">
                  <div className="relative h-20 w-20 shrink-0 shadow-2xl">
                    {playlist.coverImage ? (
                      <img
                        src={playlist.coverImage}
                        alt={playlist.title}
                        className="rounded-xl object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-xl border border-white/5">
                        <ListMusic className="h-10 w-10 text-zinc-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      <Play
                        fill="white"
                        size={24}
                        className="text-white transform scale-90 group-hover:scale-100 transition-transform duration-200"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0 space-y-1">
                    <h3 className="text-white font-bold text-lg truncate group-hover:text-primary transition-colors">
                      {playlist.title}
                    </h3>
                    <p className="text-zinc-500 text-sm font-medium line-clamp-1">
                      {playlist.description || "Public Playlist • One Melody"}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-4 hidden sm:block">
                  <p className="text-zinc-500 text-xs font-semibold group-hover:text-zinc-300 transition-colors uppercase tracking-widest">
                    Playlist
                  </p>
                </div>
              </Link>
            ))}
      </div>
      {!isLoading && (!data?.data || data.data.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">No playlists found</p>
        </div>
      )}
    </div>
  );
}
