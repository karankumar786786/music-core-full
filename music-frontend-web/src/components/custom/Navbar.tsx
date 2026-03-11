import { Search, Music, ListMusic, Loader2, Play, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { musicApi } from "@/lib/api";
import AuthModal from "./AuthModal";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { getCoverImageUrl } from "@/lib/s3";
import { Skeleton } from "@/components/ui/skeleton";
import { playerActions } from "@/Store/playerStore";
import { mapToPlayerSong } from "@/lib/player-utils";

export default function Navbar() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as any;
  const [query, setQuery] = useState(search.q || "");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => musicApi.getProfile(),
    retry: false,
    enabled: !!localStorage.getItem("access_token"),
  });

  const [debouncedQuery, debouncer] = useDebouncedValue(
    query,
    { wait: 300 },
    (state) => ({ isPending: state.isPending }),
  );

  // Fetch search results for the dropdown
  const { data: searchResults, isFetching: isQueryFetching } = useQuery({
    queryKey: ["global-search-dropdown", debouncedQuery],
    queryFn: () => musicApi.search(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 30000,
  });

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ["search-history"],
    queryFn: () => musicApi.getSearchHistory(),
    enabled: !!user && isDropdownOpen && query.trim().length === 0,
  });

  const isFetching = isQueryFetching || debouncer.state.isPending;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (
    e?: React.FormEvent,
    submitQuery?: string,
    isFromHistory: boolean = false,
  ) => {
    e?.preventDefault();
    const q = submitQuery ?? query;
    if (q.trim()) {
      setIsDropdownOpen(false);

      if (!isFromHistory) {
        setQuery("");
        navigate({
          to: "/search",
          search: { q },
        });
        musicApi
          .addSearchHistory({ searchString: q })
          .then(() => refetchHistory())
          .catch(console.error);
      } else {
        // Keep the dropdown open to show results
        setIsDropdownOpen(true);
      }
    }
  };

  const logHistoryIfNotDuplicate = async (title: string) => {
    // If it perfectly matches a recent searched item, don't duplicate it in the DB again
    const isDuplicate = historyData?.some(
      (h: any) => h.searchString.toLowerCase() === title.toLowerCase(),
    );

    if (!isDuplicate) {
      try {
        await musicApi.addSearchHistory({ searchString: title });
        await refetchHistory();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const hasResults =
    searchResults?.data &&
    ((searchResults.data.songs?.length ?? 0) > 0 ||
      (searchResults.data.artists?.length ?? 0) > 0 ||
      (searchResults.data.playlists?.length ?? 0) > 0);

  return (
    <header className="flex h-20 items-center justify-between glass-effect border-none px-8 sticky top-0 z-50">
      {/* Search Bar */}
      <div className="relative w-[400px] group" ref={dropdownRef}>
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search for songs, artists, or playlists..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="h-11 w-full rounded-2xl border-white/5 bg-white/5 pl-11 text-sm text-white placeholder:text-zinc-600 focus:bg-white/10 focus:ring-primary/20 transition-all duration-300 focus:border-white/10"
          />
          {isFetching && (
            <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
          )}
        </form>

        {/* Search Results Dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[450px] animate-in fade-in zoom-in-95 duration-200 z-50">
            <div className="overflow-y-auto p-2 no-scrollbar">
              {query.trim().length === 0 ? (
                <div className="p-3 space-y-2">
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">
                    Recent Searches
                  </div>
                  {historyData && historyData.length > 0 ? (
                    historyData.slice(0, 5).map((history: any) => (
                      <button
                        key={history.id}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all duration-200 text-left group/item border border-transparent hover:border-white/5"
                        onClick={() => {
                          setQuery(history.searchString);
                          handleSearchSubmit(
                            undefined,
                            history.searchString,
                            true,
                          );
                        }}
                      >
                        <History className="h-4 w-4 text-zinc-500 group-hover/item:text-primary transition-colors" />
                        <span className="text-sm font-medium text-white group-hover/item:text-primary transition-colors flex-1 line-clamp-1">
                          {history.searchString}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center">
                      <p className="text-zinc-500 text-sm font-medium">
                        No recent searches
                      </p>
                    </div>
                  )}
                </div>
              ) : isFetching && !searchResults ? (
                <div className="p-3 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg bg-white/5" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-1/2 bg-white/5" />
                        <Skeleton className="h-2 w-1/3 bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !hasResults ? (
                <div className="p-8 text-center">
                  <p className="text-zinc-500 text-sm font-medium">
                    No results found for "{query}"
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-1">
                  {/* Songs Section */}
                  {searchResults.data.songs?.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-0.5">
                        Songs
                      </div>
                      {searchResults.data.songs.slice(0, 4).map((song: any) => (
                        <button
                          key={song.id}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all duration-200 text-left group/item border border-transparent hover:border-white/5"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setQuery("");
                            logHistoryIfNotDuplicate(song.title);
                            playerActions.playSong(mapToPlayerSong(song));
                          }}
                        >
                          <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-white/5 overflow-hidden relative shadow-lg group-hover/item:border-primary/20 transition-colors">
                            {song.storageKey ? (
                              <img
                                src={
                                  getCoverImageUrl(
                                    song.storageKey,
                                    "small",
                                    true,
                                  )!
                                }
                                alt=""
                                className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
                                <Music className="h-4 w-4" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[1px]">
                              <Play className="h-4 w-4 text-white fill-current" />
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-bold text-white truncate group-hover/item:text-primary transition-colors tracking-tight">
                              {song.title}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">
                              {song.artistName}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Artists Section */}
                  {searchResults.data.artists?.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-0.5">
                        Artists
                      </div>
                      {searchResults.data.artists
                        .slice(0, 3)
                        .map((artist: any) => (
                          <Link
                            to="/artists/$artistId"
                            params={{ artistId: artist.id }}
                            key={artist.id}
                            onClick={() => {
                              setIsDropdownOpen(false);
                              setQuery("");
                              logHistoryIfNotDuplicate(artist.artistName);
                            }}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all duration-200 group/item border border-transparent hover:border-white/5"
                          >
                            <div className="h-10 w-10 rounded-full bg-zinc-900 border border-white/5 overflow-hidden relative shadow-lg group-hover/item:border-primary/20 transition-colors">
                              {artist.storageKey ? (
                                <img
                                  src={
                                    getCoverImageUrl(
                                      artist.storageKey,
                                      "small",
                                    )!
                                  }
                                  alt=""
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary uppercase font-black text-xs">
                                  {artist.artistName[0]}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm font-bold text-white group-hover/item:text-primary transition-colors truncate tracking-tight">
                                {artist.artistName}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                Artist
                              </span>
                            </div>
                          </Link>
                        ))}
                    </div>
                  )}

                  {/* Playlists Section */}
                  {searchResults.data.playlists?.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-0.5">
                        Playlists
                      </div>
                      {searchResults.data.playlists
                        .slice(0, 3)
                        .map((playlist: any) => (
                          <Link
                            to="/playlists/$playlistId"
                            params={{ playlistId: playlist.id }}
                            key={playlist.id}
                            onClick={() => {
                              setIsDropdownOpen(false);
                              setQuery("");
                              logHistoryIfNotDuplicate(playlist.title);
                            }}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all duration-200 group/item border border-transparent hover:border-white/5"
                          >
                            <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-white/5 overflow-hidden relative shadow-lg group-hover/item:border-primary/20 transition-colors">
                              {playlist.storageKey ? (
                                <img
                                  src={
                                    getCoverImageUrl(
                                      playlist.storageKey,
                                      "small",
                                    )!
                                  }
                                  alt=""
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center bg-white/5 text-zinc-600">
                                  <ListMusic className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm font-bold text-white group-hover/item:text-primary transition-colors truncate tracking-tight">
                                {playlist.title}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                Playlist
                              </span>
                            </div>
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {hasResults && query.trim().length > 0 && (
              <button
                onClick={(e) => handleSearchSubmit(e)}
                className="p-3 bg-white/5 hover:bg-primary hover:text-black border-t border-white/5 transition-all text-[10px] font-black uppercase tracking-[0.2em] text-center text-white w-full"
              >
                View all results
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {!user && (
          <Button
            onClick={() => setIsAuthModalOpen(true)}
            className="rounded-full bg-primary hover:bg-primary/90 px-6 font-bold"
          >
            Login
          </Button>
        )}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </header>
  );
}
