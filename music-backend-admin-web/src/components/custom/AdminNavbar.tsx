import {
  Search,
  Bell,
  Moon,
  Sun,
  Loader2,
  Music,
  UserSquare2,
  ListMusic,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@tanstack/react-store";
import { adminStore } from "@/Store/adminStore";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Link } from "@tanstack/react-router";

// Custom hook for debouncing search term
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminNavbar() {
  const { user } = useStore(adminStore, (s) => s);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ["global-search", debouncedSearchQuery],
    queryFn: () => adminApi.globalSearch(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length > 0,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hasResults =
    searchResults?.data &&
    (searchResults.data.songs?.length > 0 ||
      searchResults.data.artists?.length > 0 ||
      searchResults.data.playlists?.length > 0);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 relative z-50">
      <div className="relative w-full max-w-lg" ref={searchContainerRef}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search songs, artists, playlists..."
            className="w-full bg-background pl-9 h-9"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
          />
          {isFetching && (
            <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && debouncedSearchQuery.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[400px]">
            {isFetching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : !hasResults ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found for "{debouncedSearchQuery}"
              </div>
            ) : (
              <div className="overflow-y-auto py-2">
                {/* Songs Results */}
                {searchResults.data.songs?.length > 0 && (
                  <div className="mb-2">
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Songs
                    </div>
                    {searchResults.data.songs.slice(0, 5).map((song: any) => (
                      <Link
                        to="/songs"
                        key={`song-${song.id}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-muted transition-colors"
                      >
                        <MockThumbnail icon={Music} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">
                            {song.title}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {song.artistName}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Artists Results */}
                {searchResults.data.artists?.length > 0 && (
                  <div className="mb-2">
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Artists
                    </div>
                    {searchResults.data.artists
                      .slice(0, 3)
                      .map((artist: any) => (
                        <Link
                          to="/artists/$artistId"
                          params={{ artistId: artist.id }}
                          key={`artist-${artist.id}`}
                          onClick={() => setIsSearchOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-muted transition-colors"
                        >
                          <MockThumbnail icon={UserSquare2} rounded="full" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate capitalize">
                              {artist.artistName}
                            </span>
                          </div>
                        </Link>
                      ))}
                  </div>
                )}

                {/* Playlists Results */}
                {searchResults.data.playlists?.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Playlists
                    </div>
                    {searchResults.data.playlists
                      .slice(0, 3)
                      .map((playlist: any) => (
                        <Link
                          to="/playlists/$playlistId"
                          params={{ playlistId: playlist.id }}
                          key={`playlist-${playlist.id}`}
                          onClick={() => setIsSearchOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-muted transition-colors"
                        >
                          <MockThumbnail icon={ListMusic} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">
                              {playlist.title}
                            </span>
                          </div>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-5 w-5" />
        </Button>
        <Separator orientation="vertical" className="h-6" />

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "flex items-center gap-2 pl-2 h-auto py-1.5 cursor-pointer focus:outline-none",
            )}
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold ring-1 ring-primary/20">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="hidden md:flex flex-col items-start text-left">
              <span className="text-sm font-semibold leading-tight">
                {user?.name || "Admin"}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">
                {user?.role || "Administrator"}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 font-medium cursor-pointer">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function MockThumbnail({
  icon: Icon,
  rounded = "md",
}: {
  icon: any;
  rounded?: "md" | "full";
}) {
  return (
    <div
      className={cn(
        "h-8 w-8 bg-muted flex items-center justify-center shrink-0 border",
        rounded === "full" ? "rounded-full" : "rounded-md",
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
