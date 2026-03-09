"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@tanstack/react-store";
import { playerStore, playerActions } from "@/Store/playerStore";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Music,
  Heart,
} from "lucide-react";
import Hls from "hls.js";
import { musicApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getCoverImageUrl } from "@/lib/s3";

export default function RightSide() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const state = useStore(playerStore, (s) => s);
  const { currentSong, isPlaying, volume, isMuted, duration } = state;

  const [localTime, setLocalTime] = useState(0);

  // Initialize HLS
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const streamUrl = `${currentSong.songBaseUrl}/master.m3u8`;

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();

      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(audioRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isPlaying) audioRef.current?.play();
      });
    } else if (audioRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      audioRef.current.src = streamUrl;
    }
  }, [currentSong]);

  // Sync isPlaying and Track Views
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => playerActions.setIsPlaying(false));
      musicApi.addView(currentSong.id).catch(console.error);
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong?.id]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setLocalTime(time);
    playerActions.setCurrentTime(time);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    playerActions.setDuration(audioRef.current.duration);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!currentSong) {
    return (
      <div className="w-[350px] bg-black border-l border-white/5 flex flex-col h-full items-center justify-center text-zinc-500 text-sm italic p-6 text-center flex-none">
        <Music className="h-8 w-8 mb-4 opacity-20" />
        <p>Select a track to start listening</p>
      </div>
    );
  }

  const currentIndex = state.queue.findIndex((s) => s.id === currentSong.id);
  const queueSongs = state.queue.filter((s) => s.id !== currentSong.id);

  return (
    <div className="w-[350px] bg-black border-l border-white/5 flex flex-col h-full overflow-hidden flex-none">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => playerActions.playNext()}
      />

      {/* Now Playing Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/5">
        <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">
          Now Playing
        </h2>
      </div>

      {/* Cover Art + Song Info */}
      <div className="p-6 space-y-5">
        <div className="aspect-square w-full rounded-2xl overflow-hidden border border-white/5 shadow-lg bg-zinc-900">
          <img
            src={
              currentSong.storageKey
                ? getCoverImageUrl(currentSong.storageKey, "large", true) ||
                  currentSong.coverImageUrl
                : currentSong.coverImageUrl
            }
            alt={currentSong.title}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="space-y-1">
          <h3 className="font-semibold text-white text-sm truncate">
            {currentSong.title}
          </h3>
          <p className="text-[10px] text-zinc-500 truncate font-medium">
            {currentSong.artist}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Slider
            value={[localTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={(val: any) => {
              const v = Array.isArray(val) ? val[0] : val;
              if (audioRef.current && v !== undefined) {
                audioRef.current.currentTime = v;
              }
            }}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] tabular-nums text-zinc-500 font-mono">
            <span>{formatTime(localTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 hover:text-white"
            onClick={() => playerActions.playPrevious()}
          >
            <SkipBack className="h-4 w-4 fill-current" />
          </Button>

          <Button
            className="h-12 w-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            onClick={() => playerActions.setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 hover:text-white"
            onClick={() => playerActions.playNext()}
          >
            <SkipForward className="h-4 w-4 fill-current" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 p-0"
            onClick={() => playerActions.setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-red-500" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            max={100}
            onValueChange={(val: any) => {
              const v = Array.isArray(val) ? val[0] : val;
              if (v !== undefined) playerActions.setVolume(v / 100);
            }}
            className="flex-1"
          />
        </div>
      </div>

      {/* Queue — styled like "One Melody" section */}
      {queueSongs.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col border-t border-white/5">
          <div className="flex items-center justify-between px-6 pt-4 pb-2">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">
              Up Next
            </h2>
            <span className="text-[10px] text-zinc-600 font-mono">
              {queueSongs.length} tracks
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar px-2 pb-6">
            {queueSongs.map((song, index) => (
              <div
                key={song.id}
                className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => playerActions.setCurrentSong(song)}
              >
                <div className="w-6 text-center text-zinc-600 font-mono text-xs group-hover:text-primary transition-colors">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg shadow-lg">
                  <img
                    src={song.coverImageUrl}
                    alt={song.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-3.5 w-3.5 fill-current text-white" />
                  </div>
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <h3 className="font-semibold text-white truncate group-hover:text-primary transition-colors text-sm">
                    {song.title}
                  </h3>
                  <p className="text-[10px] text-zinc-500 truncate font-medium">
                    {song.artist}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
