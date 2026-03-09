"use client";
import { Link } from "@tanstack/react-router";
import {
  House,
  History,
  Heart,
  Music,
  ListMusic,
  Plus,
  Layers,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export default function Leftside() {
  const [mounted, setMounted] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { label: "Home", icon: House, href: "/" },
    { label: "Artist", icon: Music, href: "/" },
    { label: "Playlist", icon: ListMusic, href: "/" },
    { label: "Favourites", icon: Heart, href: "/" },
    { label: "History", icon: History, href: "/" },
  ];

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    // Logic for creating playlist would go here
    console.log("Creating playlist:", newPlaylistName);
    setNewPlaylistName("");
    setIsPopoverOpen(false);
  };

  return (
    <div className="h-full w-[260px] flex flex-col bg-black border-r border-white/5 flex-none overflow-hidden">
      {/* Logo and Brand Name */}
      <Link to="/">
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Layers className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-xl font-bold tracking-tighter text-white">
            ONE MELODY
          </div>
        </div>
      </Link>

      <div className="flex flex-col px-3 h-full overflow-y-auto">
        {/* User Greeting */}
        <div className="mb-6 px-3">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1">
            Welcome back,
          </p>
          <h2 className="text-lg font-bold text-white truncate">Rahul Gupta</h2>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-1 mb-8">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              search={{ tab: item.label.toLowerCase() }}
              className="flex items-center gap-4 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all group [&.active]:bg-zinc-900 [&.active]:text-white"
              activeProps={{ className: "active" }}
              activeOptions={{ exact: true, includeSearch: true }}
            >
              <item.icon className="w-5 h-5 transition-colors" />
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Playlists Section */}
        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between px-3 mb-4">
            <Link to="/">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] hover:text-zinc-300 transition-colors cursor-pointer">
                Your Playlists
              </h3>
            </Link>
            {mounted && (
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger>
                  <button className="outline-none p-1 hover:bg-zinc-800 rounded-md transition-colors group">
                    <Plus className="w-4 h-4 text-zinc-500 group-hover:text-white cursor-pointer transition-colors" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 bg-zinc-900 border-zinc-800 shadow-2xl p-6"
                  align="start"
                  side="right"
                >
                  <PopoverHeader className="mb-4">
                    <PopoverTitle className="text-lg font-bold text-white">
                      Create Playlist
                    </PopoverTitle>
                  </PopoverHeader>
                  <form onSubmit={handleCreatePlaylist}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1">
                          Playlist Name
                        </label>
                        <Input
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          placeholder="e.g. Late Night Vibes"
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:ring-primary/20 focus:border-primary h-11"
                          autoFocus
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 transition-all active:scale-[0.98]"
                        disabled={!newPlaylistName.trim()}
                      >
                        Create Playlist
                      </Button>
                    </div>
                  </form>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[40vh] no-scrollbar">
            <div className="px-3 py-2 text-sm text-zinc-500 italic">
              No playlists yet
            </div>
          </div>
        </div>
      </div>

      {/* Profile Footer */}
      <div className="mt-auto border-t border-white/5 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-zinc-900/50 p-3 border border-white/5">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            R
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-semibold text-white">
              Rahul Gupta
            </span>
            <span className="truncate text-xs text-zinc-500">
              rahul@example.com
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
