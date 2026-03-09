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
  ChevronDown,
} from "lucide-react";
import Hls from "hls.js";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface LyricCue {
  start: number;
  end: number;
  text: string;
}

export default function RightSide() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  const state = useStore(playerStore, (s) => s);
  const { currentSong, isPlaying, volume, isMuted, duration } = state;

  const [localTime, setLocalTime] = useState(0);
  const [lyrics] = useState<LyricCue[]>([]);
  const [currentCueIndex, setCurrentCueIndex] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

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

  // Sync isPlaying
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => playerActions.setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setLocalTime(time);
    playerActions.setCurrentTime(time);

    // Sync lyrics
    if (lyrics.length > 0) {
      const index = lyrics.findIndex(
        (cue) => time >= cue.start && time <= cue.end,
      );
      if (index !== -1 && index !== currentCueIndex) {
        setCurrentCueIndex(index);
        const activeLine = lyricsContainerRef.current?.querySelector(
          `[data-index="${index}"]`,
        );
        activeLine?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
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
        Select a track to start listening and view lyrics
      </div>
    );
  }

  return (
    <div className="w-[350px] bg-black border-l border-white/5 flex flex-col h-full overflow-hidden flex-none">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => playerActions.playNext()}
      />

      {/* Album Art Section */}
      <div className="p-6">
        <div className="aspect-square w-full shadow-2xl rounded-2xl overflow-hidden border border-white/10 group relative">
          <img
            src={currentSong.coverImageUrl}
            alt={currentSong.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs font-medium">Currently Playing</p>
          </div>
        </div>
      </div>

      {/* Lyrics Section */}
      <div className="flex-1 px-6 overflow-y-auto no-scrollbar mask-fade-edge">
        <div ref={lyricsContainerRef} className="space-y-6 py-10">
          {lyrics.length > 0 ? (
            lyrics.map((cue, index) => (
              <div
                key={index}
                data-index={index}
                className={`text-2xl font-bold leading-tight cursor-pointer transition-all duration-300 ${
                  index === currentCueIndex
                    ? "text-white scale-100 opacity-100"
                    : "text-white/20 scale-95 hover:text-white/40"
                }`}
                onClick={() => {
                  if (audioRef.current)
                    audioRef.current.currentTime = cue.start;
                }}
              >
                {cue.text}
              </div>
            ))
          ) : (
            <div className="text-center text-zinc-600 py-20 italic">
              <div className="text-4xl mb-4 opacity-20">🎤</div>
              <p>Lyrics synchronization coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Compact Player Controls */}
      <div className="mt-auto bg-zinc-900/20 backdrop-blur-md border-t border-white/5 p-6 space-y-4">
        {/* Song Info */}
        <div>
          <h3 className="text-white font-bold text-lg truncate leading-tight">
            {currentSong.title}
          </h3>
          <p className="text-zinc-500 text-sm truncate">{currentSong.artist}</p>
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
          <div className="flex justify-between text-[10px] tabular-nums text-zinc-500 font-bold tracking-wider">
            <span>{formatTime(localTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-500 hover:text-white"
            onClick={() => playerActions.playPrevious()}
          >
            <SkipBack className="h-5 w-5 fill-current" />
          </Button>

          <Button
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-lg shadow-primary/20"
            onClick={() => playerActions.setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="h-7 w-7 fill-current" />
            ) : (
              <Play className="h-7 w-7 fill-current ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-500 hover:text-white"
            onClick={() => playerActions.playNext()}
          >
            <SkipForward className="h-5 w-5 fill-current" />
          </Button>
        </div>

        {/* Volume & Quality */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-2 flex-1">
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
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-white/10 bg-transparent text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-tighter"
            onClick={() => setShowQualityMenu(!showQualityMenu)}
          >
            High <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
