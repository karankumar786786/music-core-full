import { Search, UserCircle, Bell, LogOut } from "lucide-react";
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

export default function Navbar() {
  const [query, setQuery] = useState("");
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
      console.log("Searching for:", val);
      // Here you would trigger the search API call
    },
    {
      wait: 300,
    },
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const handleLogout = () => {
    musicApi.logout();
    queryClient.setQueryData(["me"], null);
    queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  return (
    <header className="flex h-20 items-center justify-between border-b border-white/10 bg-black px-8">
      {/* Search Bar */}
      <div className="relative w-[400px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Search for songs, artists, or albums..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-full border-white/5 bg-zinc-900/50 pl-10 text-sm text-white placeholder:text-zinc-500 focus:bg-zinc-900 focus:ring-primary/20"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white"
        >
          <Bell className="h-5 w-5" />
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-zinc-900/50 p-1 pr-4 pl-1 hover:bg-zinc-900 transition-colors cursor-pointer group">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <UserCircle className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                  {user.name}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-900 border-white/10 text-white">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
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
