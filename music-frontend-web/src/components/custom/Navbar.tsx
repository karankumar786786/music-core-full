import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import AuthModal from "./AuthModal";

import { useNavigate, useSearch } from "@tanstack/react-router";

export default function Navbar() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as any;
  const [query, setQuery] = useState(search.q || "");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => musicApi.getProfile(),
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
