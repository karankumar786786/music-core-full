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
  ChevronDown,
  Activity,
  Repeat1,
} from "lucide-react";
import Hls from "hls.js";
import { musicApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { getCoverImageUrl, getSongBaseUrl } from "@/lib/s3";
import { PlaylistButton } from "./SongActions";

interface LyricCue {
  start: number;
  end: number;
  text: string;
}

interface QualityLevel {
  bitrate: number;
  width?: number;
  height?: number;
}

export default function RightSide() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  const state = useStore(playerStore, (s) => s);
  const { currentSong, isPlaying, volume, isMuted, duration, repeatMode } =
    state;

  const [localTime, setLocalTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [lyrics, setLyrics] = useState<LyricCue[]>([]);
  const [currentCueIndex, setCurrentCueIndex] = useState<number>(-1);
  const currentCueIndexRef = useRef<number>(-1);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [currentBitrate, setCurrentBitrate] = useState<number | null>(null);

  // Reset state when song changes
  useEffect(() => {
    setLocalTime(0);
    setBuffered(0);
    setLyrics([]);
    setCurrentCueIndex(-1);
    currentCueIndexRef.current = -1;
    setQualityLevels([]);
    setCurrentQuality(-1);
    setCurrentBitrate(null);
  }, [currentSong?.id]);

  // Load captions/lyrics
  useEffect(() => {
    const loadLyrics = async () => {
      const baseUrl =
        getSongBaseUrl(currentSong?.storageKey) || currentSong?.songBaseUrl;
      if (!baseUrl) {
        setLyrics([]);
        return;
      }
      try {
        const captionUrl = `${baseUrl}/caption.vtt`;
        const response = await fetch(captionUrl);
        if (!response.ok) throw new Error("Captions not found");
        const vttText = await response.text();
        if (!vttText.trim().startsWith("WEBVTT"))
          throw new Error("Invalid VTT format");

        const lines = vttText.split("\n");
        const parsedCues: LyricCue[] = [];
        let tempCue: Partial<LyricCue> | null = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || line === "WEBVTT") continue;
          if (line.includes("-->")) {
            const [start, end] = line.split("-->").map((t) => t.trim());
            tempCue = {
              start: parseTimestamp(start),
              end: parseTimestamp(end),
              text: "",
            };
          } else if (tempCue && line) {
            tempCue.text = (tempCue.text ? tempCue.text + " " : "") + line;
            if (
              i + 1 === lines.length ||
              !lines[i + 1].trim() ||
              lines[i + 1].includes("-->")
            ) {
              parsedCues.push(tempCue as LyricCue);
              tempCue = null;
            }
          }
        }
        setLyrics(parsedCues);
      } catch {
        setLyrics([]);
      }
    };
    loadLyrics();
  }, [currentSong?.id]);

  const parseTimestamp = (timestamp: string): number => {
    const parts = timestamp.split(":");
    let hours = 0,
      minutes = 0,
      seconds = 0;
    if (parts.length === 3) {
      hours = parseInt(parts[0]);
      minutes = parseInt(parts[1]);
      seconds = parseFloat(parts[2]);
    } else if (parts.length === 2) {
      minutes = parseInt(parts[0]);
      seconds = parseFloat(parts[1]);
    }
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Initialize HLS
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    const baseUrl =
      getSongBaseUrl(currentSong.storageKey) || currentSong.songBaseUrl;
    if (!baseUrl) return;
    const streamUrl = `${baseUrl}/master.m3u8`;

    // Destroy previous instance
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
        setQualityLevels(hls.levels as QualityLevel[]);
        if (audioRef.current) {
          audioRef.current.volume = isMuted ? 0 : volume * 0.6;
        }
        if (isPlaying) audioRef.current?.play().catch(console.error);
      });
      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        if (data.details.totalduration)
          playerActions.setDuration(data.details.totalduration);
      });
      hls.on(Hls.Events.FRAG_CHANGED, (_, data) => {
        const level = hls.levels[data.frag.level];
        if (level) setCurrentBitrate(Math.round(level.bitrate / 1000));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (audioRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      audioRef.current.src = streamUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentSong?.id]);

  // Sync Play/Pause
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => playerActions.setIsPlaying(false));
      musicApi.addView(currentSong.id).catch(console.error);
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong?.id]);

  // Sync volume to audio element
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume * 0.6;
    audioRef.current.muted = isMuted;
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setLocalTime(time);
    playerActions.setCurrentTime(time);

    if (lyrics.length > 0) {
      let newCueIndex = -1;
      for (let i = 0; i < lyrics.length; i++) {
        if (time >= lyrics[i].start && time <= lyrics[i].end) {
          newCueIndex = i;
          break;
        }
      }

      if (newCueIndex !== currentCueIndexRef.current) {
        currentCueIndexRef.current = newCueIndex;
        setCurrentCueIndex(newCueIndex);

        if (newCueIndex !== -1 && lyricsContainerRef.current) {
          const activeLine = lyricsContainerRef.current.querySelector(
            `[data-index="${newCueIndex}"]`,
          );
          if (activeLine) {
            activeLine.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getQualityMeta = (bitrate: number) => {
    const kbps = Math.round(bitrate / 1000);
    if (kbps >= 120)
      return { label: "High", icon: "HQ", kbps, desc: "Best quality" };
    if (kbps >= 60)
      return { label: "Medium", icon: "MQ", kbps, desc: "Balanced" };
    return { label: "Low", icon: "LQ", kbps, desc: "Data saver" };
  };

  if (!currentSong) {
    return (
      <div className="w-[400px] glass-effect-strong border-l border-white/5 flex flex-col h-full items-center justify-center text-zinc-500 text-sm italic p-6 text-center flex-none relative z-50">
        <div className="absolute top-0 right-0 w-full h-px bg-linear-to-r from-transparent via-primary/10 to-transparent" />
        <Music className="h-10 w-10 mb-4 opacity-20 animate-pulse" />
        <p className="font-medium tracking-tight">
          Select a track to start listening
        </p>
      </div>
    );
  }

  const progress = duration > 0 ? (localTime / duration) * 100 : 0;
  const safeProgress = isFinite(progress) ? progress : 0;
  const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;
  const safeBufferedProgress = isFinite(bufferedProgress)
    ? Math.max(safeProgress, bufferedProgress)
    : safeProgress;
  const volProgress = isMuted ? 0 : volume * 100;

  return (
    <div className="w-[360px] glass-effect-strong border-none flex flex-col h-full overflow-hidden flex-none relative z-50">
      <div className="absolute top-0 right-0 w-full h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onProgress={() => {
          if (audioRef.current?.buffered.length)
            setBuffered(
              audioRef.current.buffered.end(
                audioRef.current.buffered.length - 1,
              ),
            );
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && isFinite(audioRef.current.duration))
            playerActions.setDuration(audioRef.current.duration);
          if (audioRef.current)
            audioRef.current.volume = isMuted ? 0 : volume * 0.6;
        }}
        onEnded={() => {
          if (repeatMode === "one" && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
          } else {
            playerActions.playNext();
          }
        }}
      />

      {/* Album Art — 20vh */}
      <div className="h-[25vh] px-8 pt-8 pb-4 flex-none group">
        <div className="h-full w-full rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 border border-white/10 relative transition-transform duration-700 group-hover:scale-[1.02]">
          <img
            src={
              currentSong.storageKey
                ? getCoverImageUrl(currentSong.storageKey, "large", true) ||
                  currentSong.coverImageUrl
                : currentSong.coverImageUrl
            }
            alt={currentSong.title}
            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Lyrics — 35vh with fade mask */}
      <div
        ref={lyricsContainerRef}
        className="h-[35vh] overflow-y-auto no-scrollbar px-8 py-4 space-y-10"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
        }}
      >
        {lyrics.length > 0 ? (
          lyrics.map((cue, index) => {
            const segments = cue.text
              .split(/,|\n/)
              .map((s) => s.trim())
              .filter(Boolean);
            const isActive = index === currentCueIndex;
            const isPast = index < currentCueIndex;

            return (
              <div
                key={index}
                data-index={index}
                onClick={() => {
                  if (audioRef.current)
                    audioRef.current.currentTime = cue.start;
                }}
                // NOTE: No scale transform here — it causes scroll position miscalculation
                className={`cursor-pointer transition-all duration-500 text-center flex flex-col gap-2 ${
                  isActive
                    ? ""
                    : isPast
                      ? "opacity-30"
                      : "opacity-40 hover:opacity-70"
                }`}
              >
                {segments.map((segment, si) => (
                  <span
                    key={si}
                    className={`block font-bold tracking-tight leading-tight transition-all duration-300 ${
                      isActive
                        ? "text-white text-[1.6rem]"
                        : "text-zinc-600 text-[1.3rem]"
                    }`}
                  >
                    {segment}
                  </span>
                ))}
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-800 italic text-sm">
            <Activity className="h-6 w-6 mb-4 opacity-20" />
            <p>Ready to stream</p>
          </div>
        )}
      </div>

      {/* Player — 45vh */}
      <div className="h-[45vh] px-6 pb-4 pt-2 flex flex-col justify-between flex-none bg-linear-to-t from-black via-black to-transparent">
        {/* Title and Artist */}
        <div className="space-y-1">
          <h1 className="font-bold text-zinc-300 text-[1.4rem] leading-none truncate uppercase tracking-tight">
            {currentSong.title}
          </h1>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest truncate opacity-80">
            {currentSong.artist}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-white/50 px-0.5">
            <span>{formatTime(localTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="relative px-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={localTime}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (audioRef.current && !isNaN(v))
                  audioRef.current.currentTime = v;
              }}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
              style={{
                background: `linear-gradient(to right, var(--primary) ${safeProgress}%, #ffffff ${safeProgress}%, #ffffff ${safeBufferedProgress}%, #2a2a2a ${safeBufferedProgress}%)`,
              }}
            />
          </div>
        </div>

        {/* Bitrate & Quality */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_#1ed760]" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
              Streaming at {currentBitrate || 128} kbps
            </span>
          </div>

          {qualityLevels.length > 0 && (
            <div className="relative">
              <div
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="bg-[#121212] border border-white/5 rounded-[1.2rem] p-3 flex items-center gap-3 cursor-pointer hover:bg-[#1f1f1f] transition-all"
              >
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-black text-xs shadow-lg shadow-[#1ed760]/10">
                  {currentQuality === -1
                    ? "Auto"
                    : getQualityMeta(
                        qualityLevels[currentQuality]?.bitrate || 0,
                      ).icon}
                </div>
                <div className="flex-1">
                  <div className="text-[0.95rem] font-bold text-white leading-tight">
                    {currentQuality === -1
                      ? "Auto Quality"
                      : getQualityMeta(
                          qualityLevels[currentQuality]?.bitrate || 0,
                        ).label + " Quality"}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight opacity-70">
                    {currentQuality === -1
                      ? "Best for your connection"
                      : getQualityMeta(
                          qualityLevels[currentQuality]?.bitrate || 0,
                        ).desc}
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-zinc-700 transition-transform duration-300 ${showQualityMenu ? "rotate-180 text-white" : ""}`}
                />
              </div>

              {showQualityMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-999">
                  <button
                    onClick={() => {
                      if (hlsRef.current) hlsRef.current.currentLevel = -1;
                      setCurrentQuality(-1);
                      setShowQualityMenu(false);
                    }}
                    className={`w-full text-left px-5 py-3 text-xs font-bold hover:bg-white/5 flex items-center justify-between border-b border-white/5 ${currentQuality === -1 ? "text-[#1ed760]" : "text-zinc-300"}`}
                  >
                    Auto Quality (Recommended)
                    {currentQuality === -1 && (
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    )}
                  </button>
                  {qualityLevels
                    .map((lvl, idx) => ({ ...lvl, idx }))
                    .sort((a, b) => b.bitrate - a.bitrate)
                    .map(({ bitrate, idx }) => {
                      const meta = getQualityMeta(bitrate);
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (hlsRef.current)
                              hlsRef.current.currentLevel = idx;
                            setCurrentQuality(idx);
                            setShowQualityMenu(false);
                          }}
                          className={`w-full text-left px-5 py-3 text-xs font-bold hover:bg-white/5 flex items-center justify-between ${currentQuality === idx ? "text-[#1ed760]" : "text-zinc-300"}`}
                        >
                          <span>
                            {meta.label} Quality{" "}
                            <span className="text-[8px] opacity-40 ml-1">
                              ({meta.kbps}k)
                            </span>
                          </span>
                          {currentQuality === idx && (
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-2">
          <PlaylistButton songId={currentSong.id} />

          <div className="flex items-center gap-7">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-primary hover:scale-110 active:scale-95 transition-all"
              onClick={() => playerActions.playPrevious()}
            >
              <SkipBack className="h-5 w-5 fill-current" />
            </Button>
            <Button
              className="h-12 w-12 rounded-full bg-white text-black hover:bg-primary shadow-xl transition-all active:scale-90 flex items-center justify-center p-0"
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
              className="text-white hover:bg-primary hover:scale-110 active:scale-95 transition-all"
              onClick={() => playerActions.playNext()}
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 p-0 hover:bg-primary transition-all hover:scale-110 active:scale-95 ${
              repeatMode === "one"
                ? "text-primary"
                : "text-zinc-500 hover:text-white"
            }`}
            onClick={() => playerActions.toggleRepeat()}
            title={repeatMode === "one" ? "Repeat: One" : "Repeat: Off"}
          >
            <Repeat1 className="h-5 w-5" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-4 px-2">
          <input
            type="range"
            min="0"
            max="100"
            value={volProgress}
            onChange={(e) => {
              const v = parseFloat(e.target.value) / 100;
              playerActions.setVolume(v);
              if (v > 0 && isMuted) playerActions.setIsMuted(false);
            }}
            className="flex-1 h-1 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
            style={{
              background: `linear-gradient(to right, var(--primary) ${volProgress}%, #333 ${volProgress}%)`,
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white p-0 hover:bg-transparent transition-transform hover:scale-110"
            onClick={() => playerActions.setIsMuted(!isMuted)}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5 text-red-500" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
