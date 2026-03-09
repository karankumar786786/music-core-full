"use client";
import Link from "next/link";
import { House, History, Heart, Music, ListMusic, Plus } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "../ui/popover";
import { Field, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import React, { useState } from "react";
import { useAllUserPlaylistStore } from "@/Store/AllUserPlaylistStore";
import { createUserPlaylist } from "@/app/server/createUserPlaylist";

function Leftside() {
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = React.useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { userPlaylists, addUserPlaylist } = useAllUserPlaylistStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { label: "Home", icon: House, href: "/" },
    { label: "Artist", icon: Music, href: "/artist" },
    { label: "Playlist", icon: ListMusic, href: "/playlist" },
    { label: "Favourites", icon: Heart, href: "/favourites" },
    { label: "History", icon: History, href: "/history" },
  ];

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setIsCreating(true);
    try {
      const result = await createUserPlaylist(newPlaylistName);
      if (result.success && result.data) {
        // Map backend data to frontend Playlist type
        addUserPlaylist({
          id: result.data.id.toString(),
          name: result.data.playlist_name,
          count: 0,
          coverImageUrl: "",
        });
        setNewPlaylistName("");
        setIsPopoverOpen(false);
      } else {
        console.error("Failed to create playlist:", result.error);
      }
    } catch (error) {
      console.error("Error creating playlist:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="h-full w-[17%]  flex flex-col bg-black">
      {/* Logo and Brand Name */}
      <Link href={"/"}>
        <div className="flex items-center gap-3 px-6 py-6 ">
          <Image
            src={"/image.png"}
            width={40}
            height={40}
            alt="One Melody Logo"
          />
          <div className="text-lg font-bold tracking-tighter text-white">
            ONE MELODY
          </div>
        </div>
      </Link>

      <div className="flex flex-col px-3 h-full overflow-y-auto pt-6">
        {/* User Greeting */}
        <div className="mb-6 px-3">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1">
            Welcome back,
          </p>
          <h2 className="text-lg font-bold text-white truncate">
            {user?.fullName || "Guest"}
          </h2>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-1 mb-8">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-4 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all group"
            >
              <item.icon className="w-5 h-5 group-hover:text-green-500 transition-colors" />
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Playlists Section */}
        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between px-3 mb-4">
            <Link href={"/userplaylist"}>
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] hover:text-zinc-300 transition-colors">
                Your Playlists
              </h3>
            </Link>
            {mounted && user && (
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
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
                    <FieldGroup className="gap-5">
                      <Field>
                        <FieldLabel className="text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">
                          Playlist Name
                        </FieldLabel>
                        <Input
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          placeholder="e.g. Late Night Vibes"
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:ring-green-500/20 focus:border-green-500 h-11"
                          disabled={isCreating}
                          autoFocus
                        />
                      </Field>
                      <Button
                        type="submit"
                        className="w-full bg-green-500 hover:bg-green-400 text-black font-bold h-11 transition-all active:scale-[0.98]"
                        disabled={isCreating || !newPlaylistName.trim()}
                      >
                        {isCreating ? (
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Creating...
                          </div>
                        ) : (
                          "Create Playlist"
                        )}
                      </Button>
                    </FieldGroup>
                  </form>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[40vh] scrollbar-hide">
            {userPlaylists.map((playlist) => (
              <Link
                key={playlist.id}
                href={`/userplaylist/${playlist.id}`}
                className="block px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors truncate"
              >
                {playlist.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Leftside;
