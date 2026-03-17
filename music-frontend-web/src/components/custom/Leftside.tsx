"use client";

import { Link } from "@tanstack/react-router";
import {
  House,
  History,
  Heart,
  Music,
  ListMusic,
  Plus,
  UserCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getCoverImageUrl } from "@/lib/s3";
import logo from "@/assets/image.png";

// Dialog Imports
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

// Navigation
const menuItems: {
  label: string;
  icon: any;
  to: string;
}[] = [
  { label: "Home", icon: House, to: "/" },
  { label: "Artists", icon: Music, to: "/artists" },
  { label: "Playlists", icon: ListMusic, to: "/playlists" },
  { label: "Favourites", icon: Heart, to: "/favourites" },
  { label: "History", icon: History, to: "/history" },
];

interface UserPlaylist {
  id: string;
  title: string;
  userId: number;
}

export default function Leftside() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => musicApi.getProfile(),
    retry: false,
    staleTime: Infinity,
    enabled: !!localStorage.getItem("access_token"),
  });

  const { data: playlistsData } = useQuery({
    queryKey: ["userPlaylists"],
    queryFn: () => musicApi.getUserPlaylists(),
    enabled: !!user,
  });

  const createPlaylistMutation = useMutation({
    mutationFn: (title: string) => musicApi.createUserPlaylist({ title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
      toast.success("Playlist created");
      setIsCreateOpen(false);
      setNewTitle("");
    },
    onError: () => {
      toast.error("Failed to create playlist");
    },
  });

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createPlaylistMutation.mutate(newTitle.trim());
  };

  const userPlaylists: UserPlaylist[] = playlistsData?.data || [];
  const userInitial = user?.name?.[0]?.toUpperCase() || "?";

  return (
    <div className="h-full w-[260px] flex flex-col glass-effect border-none flex-none overflow-hidden relative z-50">
      {/* Logo */}
      <Link to="/">
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
            <img
              src={logo}
              alt="One Melody Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="text-xl font-bold tracking-tighter text-white">
            ONE MELODY
          </div>
        </div>
      </Link>

      <div className="flex flex-col px-3 h-full overflow-y-auto no-scrollbar">
        {/* User Greeting */}
        {user && (
          <div className="mb-6 px-3">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1">
              Welcome back,
            </p>
            <h2 className="text-lg font-bold text-white truncate">
              {user.name}
            </h2>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1 mb-8">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center gap-4 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 [&.active]:bg-primary/10 [&.active]:text-primary group"
              activeProps={{ className: "active" }}
              activeOptions={{ exact: true }}
            >
              <item.icon className="w-5 h-5 shrink-0 transition-all group-hover:scale-110" />
              <span className="font-bold text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Playlists Section */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between px-3 mb-4">
            <Link
              to="/user-playlists"
              className="hover:opacity-80 transition-opacity cursor-pointer group flex items-center gap-1"
            >
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] group-hover:text-primary transition-colors">
                Your Playlists
              </h3>
            </Link>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger
                render={
                  <button
                    className="outline-none p-1 hover:bg-zinc-800 rounded-md transition-colors group"
                    onClick={(e) => {
                      if (!user) {
                        e.preventDefault();
                        toast.info("Please login to create playlists");
                        return;
                      }
                    }}
                  />
                }
              >
                <Plus className="w-4 h-4 text-zinc-500 group-hover:text-white cursor-pointer transition-colors" />
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold tracking-tight">
                    Create a Playlist
                  </DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleCreatePlaylist}
                  className="space-y-6 pt-4"
                >
                  <Input
                    placeholder="E.g., Workout Mix, Late Night Drives"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="bg-zinc-800/50 border-white/10 text-white focus:ring-primary focus-visible:ring-primary h-12 rounded-xl"
                    autoFocus
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsCreateOpen(false)}
                      className="rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        !newTitle.trim() || createPlaylistMutation.isPending
                      }
                      className="rounded-xl bg-primary text-black hover:bg-white/90 font-bold px-6 shadow-xl"
                    >
                      {createPlaylistMutation.isPending
                        ? "Creating..."
                        : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1 overflow-y-auto flex-1 no-scrollbar">
            {userPlaylists.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-600 italic">
                No playlists yet
              </div>
            ) : (
              userPlaylists.map((playlist: UserPlaylist) => (
                <Link
                  key={playlist.id}
                  to="/user-playlists/$playlistId"
                  params={{ playlistId: playlist.id }}
                  className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 [&.active]:bg-primary/10 [&.active]:text-primary group"
                  activeProps={{ className: "active" }}
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-primary/20 transition-colors">
                    <ListMusic className="w-4 h-4 text-zinc-600 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-bold truncate">
                    {playlist.title}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Profile Footer */}
      <div className="mt-auto border-t border-white/5 p-4 space-y-2">
        {user ? (
          <div className="flex flex-col gap-2">
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <Avatar className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 border border-primary/20 group-hover:scale-105 transition-transform">
                <AvatarImage
                  src={getCoverImageUrl(user?.profilePictureKey, "small") || ""}
                  alt={user?.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-bold text-white group-hover:text-primary transition-colors">
                  {user.name}
                </span>
                <span className="truncate text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Profile Settings
                </span>
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 border border-white/5">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 border border-primary/20">
              <UserCircle className="h-5 w-5" />
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-bold text-white">Guest</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider italic">
                Login to sync
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
