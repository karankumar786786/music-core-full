import { Search, UserCircle, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import AuthModal from "./AuthModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useNavigate, useSearch } from "@tanstack/react-router";

export default function Navbar() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as any;
  const [query, setQuery] = useState(search.q || "");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => musicApi.getMe(),
    retry: false,
    enabled: !!localStorage.getItem("access_token"),
  });

  // Using TanStack Pacer for debounced search logic
  const debouncedSearch = useDebouncedCallback(
    (val: string) => {
      if (val.trim()) {
        navigate({
          to: "/",
          search: (prev: any) => ({ ...prev, tab: "search", q: val }),
          replace: true,
        });
        // Call backend to add to search history
        musicApi.addSearchHistory({ searchString: val }).catch(console.error);
      } else if (search.tab === "search") {
        navigate({
          to: "/",
          search: (prev: any) => ({ ...prev, tab: "home", q: undefined }),
          replace: true,
        });
      }
    },
    {
      wait: 500,
    },
  );

  useEffect(() => {
    setQuery(search.q || "");
  }, [search.q]);

  useEffect(() => {
    debouncedSearch(query);
  }, [query]);

  const handleLogout = () => {
    musicApi.logout();
    queryClient.setQueryData(["me"], null);
    queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  return (
    <header className="flex h-20 items-center justify-between glass-effect border-none px-8 sticky top-0 z-50">
      {/* Search Bar */}
      <div className="relative w-[400px] group">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search for songs, artists, or albums..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 w-full rounded-2xl border-white/5 bg-white/5 pl-11 text-sm text-white placeholder:text-zinc-600 focus:bg-white/10 focus:ring-primary/20 transition-all duration-300 focus:border-white/10"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-1.5 pr-4 pl-1.5 hover:bg-white/10 transition-all duration-300 cursor-pointer group hover:border-primary/20">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/20 group-hover:scale-105 transition-transform">
                  <UserCircle className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                  {user.name}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-900 border-white/10 text-white">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem
                className="hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800"
                onClick={() =>
                  navigate({
                    to: "/",
                    search: (prev: any) => ({ ...prev, tab: "profile" }),
                  })
                }
              >
                <UserCircle className="mr-2 h-4 w-4 text-primary" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="hover:bg-zinc-800 cursor-pointer text-red-400 focus:text-red-400 focus:bg-zinc-800"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
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
