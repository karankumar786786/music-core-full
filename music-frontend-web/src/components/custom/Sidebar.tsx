import { Link } from "@tanstack/react-router";
import {
  House,
  Music,
  ListMusic,
  Heart,
  History,
  Plus,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const menuItems = [
  { label: "Home", icon: House, href: "/" },
  { label: "Artist", icon: Music, href: "/artist" },
  { label: "Playlist", icon: ListMusic, href: "/playlist" },
  { label: "Favourites", icon: Heart, href: "/favourites" },
  { label: "History", icon: History, href: "/history" },
];

export default function Sidebar() {
  const [newPlaylistName, setNewPlaylistName] = useState("");

  return (
    <div className="flex h-full w-[260px] flex-col border-r border-white/10 bg-black text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
          <Layers className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold tracking-tight">ONE MELODY</span>
      </div>

      <ScrollArea className="flex-1 px-3">
        {/* Navigation */}
        <div className="space-y-1 py-4">
          <p className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Menu
          </p>
          <nav className="mt-2 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-medium text-zinc-400 transition-all hover:bg-zinc-900 hover:text-white [&.active]:bg-zinc-900 [&.active]:text-white"
                activeProps={{ className: "active" }}
              >
                <item.icon className="h-5 w-5 transition-colors group-hover:text-primary" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <Separator className="mx-4 my-4 bg-white/5" />

        {/* Playlists */}
        <div className="space-y-1 py-4">
          <div className="flex items-center justify-between px-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              Your Library
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:bg-zinc-800"
                >
                  <Plus className="h-4 w-4 text-zinc-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-zinc-900 border-white/10 p-4">
                <PopoverHeader className="mb-4">
                  <PopoverTitle className="text-sm font-semibold text-white">
                    Create New Playlist
                  </PopoverTitle>
                </PopoverHeader>
                <div className="flex gap-2">
                  <Input
                    placeholder="Playlist name..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="h-9 bg-zinc-800 border-white/5 text-white placeholder:text-zinc-500"
                  />
                  <Button size="sm" className="h-9">
                    Create
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="mt-4 px-2">
            {/* Playlists would go here */}
            <div className="rounded-lg px-4 py-3 text-sm text-zinc-500 italic">
              No playlists yet
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Profile Footer */}
      <div className="mt-auto border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-zinc-900/50 p-3">
          <div className="h-10 w-10 rounded-full bg-zinc-800 border border-white/5" />
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-semibold">Guest User</span>
            <span className="truncate text-xs text-zinc-500">
              guest@onemelody.com
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
