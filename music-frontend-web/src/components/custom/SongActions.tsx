"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, ListMusic, Loader2, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { musicApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import AuthModal from "./AuthModal";

interface FavoriteButtonProps {
  songId: string;
  isLiked: boolean;
  onToggle?: () => void;
}

export function FavoriteButton({
  songId,
  isLiked,
  onToggle,
}: FavoriteButtonProps) {
  const queryClient = useQueryClient();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => musicApi.getMe(),
    retry: false,
    enabled: !!localStorage.getItem("access_token"),
  });

  const toggleMutation = useMutation({
    mutationFn: () =>
      isLiked
        ? musicApi.removeFavourite(songId)
        : musicApi.addFavourite(songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favourites"] });
      queryClient.invalidateQueries({ queryKey: ["trending"] });
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      queryClient.invalidateQueries({ queryKey: ["featured"] });

      if (onToggle) onToggle();

      toast.success(
        isLiked ? "Removed from favourites" : "Added to favourites",
      );
    },
    onError: (error: { response?: { status?: number } }) => {
      if (error.response?.status === 401) {
        setIsAuthModalOpen(true);
      } else {
        toast.error("Failed to update favourites");
      }
    },
  });

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    toggleMutation.mutate();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={`rounded-full hover:bg-white/10 transition-all ${
          isLiked ? "text-primary" : "text-zinc-500 hover:text-white"
        }`}
        onClick={handleToggle}
        disabled={toggleMutation.isPending}
      >
        {toggleMutation.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Heart
            className={`h-5 w-5 ${isLiked ? "fill-current scale-110" : "hover:scale-110"}`}
          />
        )}
      </Button>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}

interface PlaylistButtonProps {
  songId: string;
}

export function PlaylistButton({ songId }: PlaylistButtonProps) {
  const queryClient = useQueryClient();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => musicApi.getMe(),
    retry: false,
    enabled: !!localStorage.getItem("access_token"),
  });

  const { data: playlistsData, isLoading: playlistsLoading } = useQuery({
    queryKey: ["userPlaylists"],
    queryFn: () => musicApi.getUserPlaylists(),
    enabled: !!user,
  });

  const addSongMutation = useMutation({
    mutationFn: (playlistId: string) =>
      musicApi.addSongToUserPlaylist(playlistId, songId),
    onSuccess: (_: unknown, playlistId: string) => {
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
      queryClient.invalidateQueries({ queryKey: ["userPlaylist", playlistId] });
      const playlist = playlistsData?.data?.find(
        (p: { id: string; title: string }) => p.id === playlistId,
      );
      toast.success(`Song added to ${playlist?.title || "playlist"}`);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error.response?.data?.message || "Failed to add song to playlist",
      );
    },
  });

  const handlePlaylistSelect = (playlistId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    addSongMutation.mutate(playlistId);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          className="rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors h-10 w-10 flex items-center justify-center"
        >
          <ListPlus className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 bg-zinc-900 border-white/10 text-white"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest px-3 py-2">
              Add to Playlist
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />

            {playlistsLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
              </div>
            ) : playlistsData?.data?.length === 0 ? (
              <DropdownMenuItem
                disabled
                className="text-zinc-500 italic text-xs"
              >
                No playlists found
              </DropdownMenuItem>
            ) : (
              playlistsData?.data?.map(
                (playlist: { id: string; title: string }) => (
                  <DropdownMenuItem
                    key={playlist.id}
                    onClick={() => handlePlaylistSelect(playlist.id)}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/10 transition-colors gap-3 py-2.5"
                  >
                    <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                      <ListMusic className="w-4 h-4 text-zinc-500" />
                    </div>
                    <span className="truncate flex-1 font-medium">
                      {playlist.title}
                    </span>
                  </DropdownMenuItem>
                ),
              )
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}
