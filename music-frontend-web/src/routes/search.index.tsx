import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { SongRow } from "@/components/custom/SongRow";
import { getCoverImageUrl } from "@/lib/s3";
import { Play, ListMusic, User, ChevronRight } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/search/")({
  validateSearch: (search) => searchSchema.parse(search),
  component: SearchResultsView,
});

function SearchResultsView() {
  const { q } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () => musicApi.search(q || ""),
    enabled: !!q,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          Search Results
        </h1>
        <p className="text-zinc-500">
          {q ? `Showing results for "${q}"` : "Enter a search term"}
        </p>
      </div>

      {!q ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">Try searching for songs, artists, or albums</p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 border-b border-zinc-900/30"
            >
              <Skeleton className="h-12 w-12 rounded-lg bg-zinc-900" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3 bg-zinc-900" />
                <Skeleton className="h-3 w-1/4 bg-zinc-900" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.data?.songs?.length &&
        !data?.data?.artists?.length &&
        !data?.data?.playlists?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">No results found for "{q}"</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Songs Results */}
          {data?.data?.songs && data?.data?.songs?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Songs
              </h2>
              <div className="flex flex-col gap-1">
                {data.data.songs.map((song: any, index: number) => (
                  <div
                    key={song.id}
                    onClickCapture={() =>
                      musicApi
                        .addSearchHistory({ searchString: song.title })
                        .catch(console.error)
                    }
                  >
                    <SongRow song={song} index={index} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Artists Results */}
          {data?.data?.artists && data?.data?.artists?.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-white tracking-tight text-center">
                Artists
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {data.data.artists.map((artist: any) => (
                  <Link
                    key={artist.id}
                    to="/artists/$artistId"
                    params={{ artistId: artist.id }}
                    onClick={() =>
                      musicApi
                        .addSearchHistory({ searchString: artist.artistName })
                        .catch(console.error)
                    }
                    className="group flex flex-col items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all text-center cursor-pointer"
                  >
                    <div className="relative h-32 w-32 overflow-hidden rounded-full ring-2 ring-zinc-900 group-hover:ring-primary/50 transition-all shadow-xl">
                      {artist.storageKey || artist.coverUrl ? (
                        <img
                          src={
                            artist.coverUrl ||
                            getCoverImageUrl(artist.storageKey, "medium") ||
                            ""
                          }
                          alt={artist.artistName}
                          className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-2xl font-bold">
                          {artist.artistName?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                        {artist.artistName}
                      </h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                        Artist
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Playlists Results */}
          {data?.data?.playlists && data?.data?.playlists?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Playlists
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.data.playlists.map((playlist: any) => (
                  <Link
                    key={playlist.id}
                    to="/playlists/$playlistId"
                    params={{ playlistId: playlist.id }}
                    onClick={() =>
                      musicApi
                        .addSearchHistory({ searchString: playlist.title })
                        .catch(console.error)
                    }
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 hover:bg-white/5 border border-white/5 transition-all cursor-pointer"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl shadow-lg">
                      {playlist.storageKey ? (
                        <img
                          src={
                            getCoverImageUrl(playlist.storageKey, "small") || ""
                          }
                          alt={playlist.title}
                          className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                          <ListMusic className="w-8 h-8 text-zinc-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-6 h-6 fill-current text-white" />
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors">
                        {playlist.title}
                      </h3>
                      <p className="text-xs text-zinc-500 truncate">
                        {playlist.description || "Public Playlist"}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 ml-auto group-hover:text-white transition-colors" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
