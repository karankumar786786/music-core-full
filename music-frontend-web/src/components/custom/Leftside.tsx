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
import React, { useState } from "react";
import logo from "@/assets/image.png";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { toast } from "sonner";

type TabType =
  | "home"
  | "artist"
  | "playlist"
  | "favourites"
  | "history"
  | "search";

const menuItems: {
  label: string;
  icon: any;
  tab: TabType;
}[] = [
  { label: "Home", icon: House, tab: "home" },
  { label: "Artists", icon: Music, tab: "artist" },
  { label: "Playlists", icon: ListMusic, tab: "playlist" },
  { label: "Favourites", icon: Heart, tab: "favourites" },
  { label: "History", icon: History, tab: "history" },
];

interface UserPlaylist {
  id: string;
  title: string;
  userId: number;
}

export default function Leftside() {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => musicApi.getMe(),
    retry: false,
    staleTime: Infinity,
    enabled: !!localStorage.getItem("access_token"),
  });

  const { data: playlistsData } = useQuery({
    queryKey: ["userPlaylists"],
    queryFn: () => musicApi.getUserPlaylists(),
    enabled: !!user,
  });

  const userPlaylists: UserPlaylist[] = playlistsData?.data || [];

  const createPlaylistMutation = useMutation({
    mutationFn: (name: string) => musicApi.createUserPlaylist({ title: name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
      toast.success(`Playlist "${newPlaylistName}" created`);
      setNewPlaylistName("");
      setIsPopoverOpen(false);
    },
    onError: () => {
      toast.error("Failed to create playlist");
    },
  });

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylistMutation.mutate(newPlaylistName.trim());
  };

  const userInitial = user?.name?.[0]?.toUpperCase() || "?";

  return (
    <div className="h-full w-[260px] flex flex-col glass-effect  flex-none overflow-hidden relative z-50">
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
              to="/"
              search={{ tab: item.tab }}
              className="flex items-center gap-4 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 [&.active]:bg-primary/10 [&.active]:text-primary group"
              activeProps={{ className: "active" }}
              activeOptions={{ exact: false, includeSearch: true }}
            >
              <item.icon className="w-5 h-5 shrink-0 transition-all group-hover:scale-110" />
              <span className="font-bold text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Playlists Section */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between px-3 mb-4">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              Your Playlists
            </h3>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger className="outline-none p-1 hover:bg-zinc-800 rounded-md transition-colors group">
                <Plus className="w-4 h-4 text-zinc-500 group-hover:text-white cursor-pointer transition-colors" />
              </PopoverTrigger>
              <PopoverContent
                className="w-72 bg-zinc-900 border-zinc-800 shadow-2xl p-5"
                align="start"
                side="right"
              >
                <PopoverHeader className="mb-4">
                  <PopoverTitle className="text-base font-bold text-white">
                    New Playlist
                  </PopoverTitle>
                </PopoverHeader>
                <form onSubmit={handleCreatePlaylist}>
                  <div className="space-y-3">
                    <Input
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="My awesome playlist..."
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 h-10"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      className="w-full font-bold h-10"
                      disabled={
                        !newPlaylistName.trim() ||
                        createPlaylistMutation.isPending
                      }
                    >
                      {createPlaylistMutation.isPending
                        ? "Creating..."
                        : "Create"}
                    </Button>
                  </div>
                </form>
              </PopoverContent>
            </Popover>
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
      <div className="mt-auto border-t border-white/5 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 border border-primary/20 group-hover:scale-105 transition-transform">
            {user ? userInitial : <UserCircle className="h-5 w-5" />}
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-bold text-white group-hover:text-primary transition-colors">
              {user?.name || "Guest"}
            </span>
            <span className="truncate text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              {user?.email || "Not logged in"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
