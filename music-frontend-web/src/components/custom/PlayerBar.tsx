import { useRef, useEffect, useState } from "react";
import { useStore } from "@tanstack/react-store";
import { useQuery } from "@tanstack/react-query";
import { playerStore, playerActions } from "@/Store/playerStore";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  ListMusic,
  Maximize2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import Hls from "hls.js";
import { getSongBaseUrl } from "@/lib/s3";
import { FavoriteButton, PlaylistButton } from "./SongActions";

export default function PlayerBar() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const state = useStore(playerStore, (s) => s);
  const [localTime, setLocalTime] = useState(0);

  const { currentSong, isPlaying, volume, isMuted, duration } = state;

  const { data: favStatus, refetch: refetchFav } = useQuery({
    queryKey: ["favourite-check", currentSong?.id],
    queryFn: () => musicApi.checkFavourite(currentSong!.id),
    enabled: !!currentSong?.id,
  });

  const isLiked = favStatus?.isFavourite ?? false;

  // Initialize HLS — re-runs only when song changes
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const baseUrl =
      getSongBaseUrl(currentSong.storageKey) || currentSong.songBaseUrl;
    if (!baseUrl) return;

    const streamUrl = `${baseUrl}/master.m3u8`;

    // Destroy previous instance before creating new one
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 20, // 20s is plenty for audio
        maxMaxBufferLength: 30, // cap at 30s
        backBufferLength: 10, // 10s back is enough
        maxBufferSize: 20 * 1000 * 1000, // 20MB max memory
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(audioRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (audioRef.current) {
          audioRef.current.volume = isMuted ? 0 : volume * 0.6;
        }
        if (isPlaying) audioRef.current?.play().catch(console.error);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR)
            hls.recoverMediaError();
          else hls.destroy();
        }
      });
    } else if (audioRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      audioRef.current.src = streamUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentSong?.id]);

  // Sync play/pause state to audio element
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => playerActions.setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Sync volume and mute state to audio element
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume * 0.6;
    audioRef.current.muted = isMuted;
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setLocalTime(audioRef.current.currentTime);
    playerActions.setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current || !isFinite(audioRef.current.duration)) return;
    playerActions.setDuration(audioRef.current.duration);
    audioRef.current.volume = isMuted ? 0 : volume * 0.6;
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!currentSong)
    return (
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-black/80 backdrop-blur-xl border-t border-zinc-800 flex items-center justify-center text-zinc-500 text-sm italic">
        Select a track to start listening
      </div>
    );

  return (
    <div className="fixed bottom-0 left-0 right-0 h-32 glass-effect-strong border-t border-white/10 px-8 flex items-center justify-between z-50">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => playerActions.playNext()}
      />

      {/* Song Info */}
      <div className="flex items-center gap-4 w-[30%]">
        <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shrink-0 group relative">
          <img
            src={currentSong.coverImageUrl}
            alt={currentSong.title}
            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:opacity-0 transition-opacity" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <h4 className="text-base font-black text-white truncate text-glow-green">
            {currentSong.title}
          </h4>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest truncate">
            {currentSong.artist}
          </p>
        </div>
        <div className="flex items-center ml-2 shrink-0">
          <FavoriteButton
            songId={currentSong.id}
            isLiked={isLiked}
            onToggle={() => refetchFav()}
          />
          <PlaylistButton songId={currentSong.id} />
        </div>
      </div>

      {/* Controls & Progress */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-[40%]">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            className={`transition-colors h-8 w-8 ${
              state.isShuffle
                ? "text-primary"
                : "text-zinc-500 hover:text-white"
            }`}
            onClick={() => playerActions.toggleShuffle()}
          >
            <Shuffle
              className={`h-4 w-4 ${state.isShuffle ? "fill-primary/20" : ""}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white h-10 w-10 hover:text-primary transition-colors"
            onClick={() => playerActions.playPrevious()}
          >
            <SkipBack className="h-6 w-6 fill-current" />
          </Button>
          <Button
            className="h-14 w-14 rounded-full bg-white text-black hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-white/10 flex items-center justify-center p-0"
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
            className="text-white h-10 w-10 hover:text-primary transition-colors"
            onClick={() => playerActions.playNext()}
          >
            <SkipForward className="h-6 w-6 fill-current" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`transition-colors h-8 w-8 ${
              state.repeatMode !== "none"
                ? "text-primary"
                : "text-zinc-500 hover:text-white"
            }`}
            onClick={() => playerActions.toggleRepeat()}
          >
            <div className="relative">
              <Repeat
                className={`h-4 w-4 ${state.repeatMode !== "none" ? "fill-primary/20" : ""}`}
              />
              {state.repeatMode === "one" && (
                <span className="absolute -top-1 -right-1 text-[8px] font-black bg-primary text-black rounded-full w-3 h-3 flex items-center justify-center border border-black">
                  1
                </span>
              )}
            </div>
          </Button>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="text-[10px] tabular-nums text-zinc-500 font-medium">
            {formatTime(localTime)}
          </span>
          <Slider
            value={[localTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={(val: any) => {
              const v = Array.isArray(val) ? val[0] : val;
              if (audioRef.current && v !== undefined)
                audioRef.current.currentTime = v;
            }}
            className="flex-1"
          />
          <span className="text-[10px] tabular-nums text-zinc-500 font-medium">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume & Extras */}
      <div className="flex items-center justify-end gap-4 w-[30%]">
        <div className="flex items-center gap-2 w-32 group">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-500 group-hover:text-white h-8 w-8 shrink-0"
            onClick={() => playerActions.setIsMuted(!isMuted)}
          >
            {isMuted || volume === 0 ? (
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
              if (v !== undefined) {
                playerActions.setVolume(v / 100);
                if (v > 0 && isMuted) playerActions.setIsMuted(false);
              }
            }}
            className="flex-1"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-500 hover:text-white h-8 w-8"
        >
          <ListMusic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-500 hover:text-white h-8 w-8"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
