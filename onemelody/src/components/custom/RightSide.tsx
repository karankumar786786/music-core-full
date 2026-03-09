"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Heart,
  Volume2,
  VolumeX,
  ChevronDown,
  ListPlus,
} from "lucide-react";
import Hls from "hls.js";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "../ui/popover";
import { Button } from "../ui/button";

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

interface QualityMeta {
  label: string;
  desc: string;
  icon: string;
}

import { useCurrentlyPlayingSongsStore } from "@/Store/CurrentlyPlayingSongsStore";
import { useAllSongsStore } from "@/Store/AllSongsStore";
import { useUserStore } from "@/Store/UserStore";
import { useAllUserPlaylistStore } from "@/Store/AllUserPlaylistStore";
import { useUserFavouriteSongsStore } from "@/Store/UserFavouriteSongsStore";
import { useUserHistorySongsStore } from "@/Store/UserHistorySongsStore";
import { addSongInUserFavourites } from "@/app/server/addSongInUserFavourites";
import { deleteUserFavouriteSong } from "@/app/server/deleteUserFavouriteSong";
import { checkSongInUserFavourites } from "@/app/server/checkSongInUserFavourites";
import { addSongToUserHistory } from "@/app/server/addSongToUserHistory";
import { addSongInUserPlaylist as addSongToPlaylistAction } from "@/app/server/addSongInUserPlaylist";
import { useAllUserPlaylistSongsStore } from "@/Store/UserPlaylistSongs";

function RightSide() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const hasTrackedPlayRef = useRef(false);

  const {
    currentSong,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    setVolume,
    queue,
  } = useCurrentlyPlayingSongsStore();

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [lyrics, setLyrics] = useState<LyricCue[]>([]);
  const [currentCueIndex, setCurrentCueIndex] = useState<number>(-1);
  const { favouriteSongs, addFavourite, removeFavourite } =
    useUserFavouriteSongsStore();
  const isLiked = currentSong
    ? favouriteSongs.some((s) => s.id === currentSong.id)
    : false;
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [currentBitrate, setCurrentBitrate] = useState<number | null>(null);

  // ... existing imports ...

  const [mounted, setMounted] = useState(false);
  const [buffered, setBuffered] = useState<number>(0);
  const [isPlaylistPopoverOpen, setIsPlaylistPopoverOpen] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);

  const { songs } = useAllSongsStore();
  const { user } = useUserStore();
  const { userPlaylists } = useAllUserPlaylistStore();
  const { historySongs } = useUserHistorySongsStore();

  const playRandomSong = (autoPlay: boolean | unknown = true) => {
    if (songs.length > 0) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      useCurrentlyPlayingSongsStore
        .getState()
        .setCurrentSong(songs[randomIndex]);
      if (typeof autoPlay === "boolean" ? autoPlay : true) {
        setIsPlaying(true);
      }
    }
  };

  const playNextSong = () => {
    if (queue.length > 0 && currentSong) {
      const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
        useCurrentlyPlayingSongsStore
          .getState()
          .setCurrentSong(queue[currentIndex + 1]);
        setIsPlaying(true);
        return;
      }
    }
    // Fallback if no queue or end of queue
    playRandomSong();
  };

  const playPreviousSong = () => {
    if (queue.length > 0 && currentSong) {
      const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
      if (currentIndex > 0) {
        useCurrentlyPlayingSongsStore
          .getState()
          .setCurrentSong(queue[currentIndex - 1]);
        setIsPlaying(true);
        return;
      }
    }

    // Fallback to history
    // historySongs[0] is the current song (if playing/tracked)
    // historySongs[1] is the previous song
    if (historySongs.length > 1) {
      const previousSong = historySongs[1];
      useCurrentlyPlayingSongsStore.getState().setCurrentSong(previousSong);
      setIsPlaying(true);
    } else {
      // Fallback to random if no history
      playRandomSong();
    }
  };

  useEffect(() => {
    setMounted(true);

    // Auto-play random song if none selected
    if (!currentSong && songs.length > 0) {
      playRandomSong(false);
    }
  }, [currentSong, songs]);

  // Configuration - Dynamic Only
  /* Early return removed to fix hooks ordering */

  const baseUrl = currentSong?.songBaseUrl || "";
  const streamUrl = currentSong ? `${baseUrl}/master.m3u8` : "";
  const captionUrl = currentSong ? `${baseUrl}/captions.vtt` : "";
  const albumArt = currentSong?.coverImageUrl || "";

  const songInfo = {
    title: currentSong?.title || "",
    artist: currentSong?.artist || "",
  };

  const addSongInUserPlaylist = async (
    playlistId: string,
    playlistName: string,
  ) => {
    if (!currentSong) return;

    setAddingToPlaylist(playlistId);
    const songId = parseInt(currentSong.id);
    const pId = parseInt(playlistId);

    try {
      const result = await addSongToPlaylistAction(pId, songId);

      if (result.success) {
        if (result.message === "Song already in playlist") {
          toast.info(`"${currentSong.title}" is already in "${playlistName}"`);
        } else {
          // Update store if needed (this store is usually loaded when opening the playlist page)
          const addSongToStore =
            useAllUserPlaylistSongsStore.getState().addSongToUserPlaylist;
          addSongToStore(playlistId, currentSong);
          toast.success(`Added "${currentSong.title}" to "${playlistName}"`);
        }
        setIsPlaylistPopoverOpen(false);
      } else {
        toast.error(`Failed to add song: ${result.error}`);
      }
    } catch (error) {
      console.error("Error adding song to playlist:", error);
      toast.error("Something went wrong");
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handleToggleFavourite = async () => {
    if (!currentSong) return;
    const songId = parseInt(currentSong.id);

    if (isLiked) {
      // Optimistic Remove
      removeFavourite(currentSong.id);

      try {
        const result = await deleteUserFavouriteSong(songId);
        if (!result.success) {
          // Revert if failed
          addFavourite(currentSong);
          console.error("Failed to remove favorite:", result.error);
        }
      } catch (error) {
        addFavourite(currentSong);
        console.error("Error removing favorite:", error);
      }
    } else {
      // Optimistic Add
      addFavourite(currentSong);

      try {
        const result = await addSongInUserFavourites(songId);
        if (!result.success) {
          // Revert if failed
          removeFavourite(currentSong.id);
          console.error("Failed to add favorite:", result.error);
        }
      } catch (error) {
        removeFavourite(currentSong.id);
        console.error("Error adding favorite:", error);
      }
    }
  };

  // Check if current song is in favorites and sync store
  useEffect(() => {
    const checkFavorite = async () => {
      if (currentSong) {
        try {
          const isFav = await checkSongInUserFavourites(
            parseInt(currentSong.id),
          );
          if (isFav && !isLiked) {
            addFavourite(currentSong);
          } else if (!isFav && isLiked) {
            removeFavourite(currentSong.id);
          }
        } catch (error) {
          console.error("Error checking favorite status:", error);
        }
      }
    };
    checkFavorite();
    // Reset history tracking for new song
    hasTrackedPlayRef.current = false;
  }, [currentSong?.id]);

  // Initialize HLS player
  useEffect(() => {
    const initHLS = () => {
      if (!audioRef.current || !streamUrl) return;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 40, // Hls.js will try to keep at least 40s buffered
          maxMaxBufferLength: 60, // Hls.js will never buffer more than 60s
          backBufferLength: 30, // Optional: Keeps 30s of past video to allow small rewinds without re-fetching
        });

        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(audioRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log("✓ HLS loaded, quality levels:", data.levels.length);
          setQualityLevels(hls.levels as QualityLevel[]);
          // Manifest parsed, we can now potentially play
          if (isPlaying) {
            audioRef.current
              ?.play()
              .catch((err) => console.error("Play failed:", err));
          }
        });

        // Track real-time bitrate and duration
        hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
          if (data.details.totalduration) {
            setDuration(data.details.totalduration);
          }
        });

        hls.on(Hls.Events.FRAG_CHANGED, (event, data) => {
          const level = hls.levels[data.frag.level];
          if (level) {
            setCurrentBitrate(Math.round(level.bitrate / 1000));
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error("HLS Error:", data);

            // Attempt recovery
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              console.log("Attempting network recovery...");
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              console.log("Attempting media recovery...");
              hls.recoverMediaError();
            }
          }
        });
      } else if (
        audioRef.current.canPlayType("application/vnd.apple.mpegurl")
      ) {
        // Safari native HLS
        audioRef.current.src = streamUrl;
      } else {
        // Unsupported
      }
    };

    initHLS();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [streamUrl]);

  // Load captions/lyrics
  useEffect(() => {
    const loadLyrics = async () => {
      if (!captionUrl) {
        setLyrics([]);
        return;
      }
      try {
        const response = await fetch(captionUrl);

        if (!response.ok) {
          throw new Error("Captions not found");
        }

        const vttText = await response.text();

        if (!vttText.trim().startsWith("WEBVTT")) {
          throw new Error("Invalid VTT format");
        }

        const lines = vttText.split("\n");
        const parsedCues = [];
        let tempCue = null;

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
            tempCue.text = line;
            parsedCues.push(tempCue);
            tempCue = null;
          }
        }

        setLyrics(parsedCues);
      } catch (error) {
        console.warn("Lyrics error:", error);
      }
    };

    loadLyrics();
  }, [captionUrl]);

  const parseTimestamp = (timestamp: string): number => {
    const parts = timestamp.split(":");
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Update current time and lyrics sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Update active lyric
      if (lyrics.length > 0) {
        let newCueIndex = -1;
        for (let i = 0; i < lyrics.length; i++) {
          if (
            audio.currentTime >= lyrics[i].start &&
            audio.currentTime <= lyrics[i].end
          ) {
            newCueIndex = i;
            break;
          }
        }

        if (newCueIndex !== currentCueIndex) {
          setCurrentCueIndex(newCueIndex);

          // Auto-scroll to active lyric
          if (newCueIndex !== -1 && lyricsContainerRef.current) {
            const activeLine = lyricsContainerRef.current.querySelector(
              `[data-index="${newCueIndex}"]`,
            );
            if (activeLine) {
              activeLine.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }
        }
      }
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const lastBuffered = audio.buffered.end(audio.buffered.length - 1);
        setBuffered(lastBuffered);
      }
    };

    // const handleLoadedMetadata = () => { // This is now handled in the HLS useEffect
    //   setDuration(audio.duration);
    // };

    const handlePlay = () => {
      setIsPlaying(true);
      // Track history when song starts playing
      if (currentSong && !hasTrackedPlayRef.current) {
        addSongToUserHistory(parseInt(currentSong.id)).then((res) => {
          if (res.success) {
            useUserHistorySongsStore.getState().addToHistory(currentSong);
            hasTrackedPlayRef.current = true;
          }
        });
      }
    };

    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("progress", handleProgress);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", playNextSong);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("progress", handleProgress);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", playNextSong);
    };
  }, [
    lyrics,
    currentCueIndex,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setCurrentTime,
    setDuration,
    playNextSong,
  ]);

  // Sync isPlaying state to audio element
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        // Only log error if it's not a user-interaction requirement error or an interruption
        if (err.name !== "NotAllowedError" && err.name !== "AbortError") {
          console.error("Auto-play blocked or failed:", err);
        }
        // If prevented, sync state back to false so user sees play button
        if (err.name === "NotAllowedError") {
          setIsPlaying(false);
        }
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]); // Removed currentSong?.id to avoid redundant play() calls during HLS load

  // Handle play/pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Handle volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  // Skip forward/backward
  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  // Quality selection
  const getQualityMeta = (bitrate: number): QualityMeta => {
    const kbps = Math.round(bitrate / 1000);
    if (kbps >= 100)
      return { label: "High", desc: `${kbps} kbps • Best quality`, icon: "HQ" };
    if (kbps >= 64)
      return { label: "Medium", desc: `${kbps} kbps • Balanced`, icon: "MQ" };
    return { label: "Low", desc: `${kbps} kbps • Data saver`, icon: "LQ" };
  };

  const setQuality = (levelIndex: number) => {
    if (!hlsRef.current) return;

    setCurrentQuality(levelIndex);
    hlsRef.current.currentLevel = levelIndex; // -1 = auto
    setShowQualityMenu(false);
  };

  const handleLyricClick = (startTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
    }
  };

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getQualityDisplay = (): string => {
    if (currentQuality === -1) return "Auto";
    if (qualityLevels[currentQuality]) {
      return getQualityMeta(qualityLevels[currentQuality].bitrate).icon;
    }
    return "AUTO";
  };

  if (!currentSong) {
    if (!mounted) return null;
    return (
      <div className="pl-4 w-[25%] bg-black flex flex-col h-full items-center justify-center text-white/50">
        <p>Select a song to play</p>
      </div>
    );
  }

  return (
    <div className=" pl-4 w-[25%] bg-black  flex flex-col  h-full overflow-hidden">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />

      {/* Album Art */}
      <div className="w-[94%] mx-auto mt-4 h-[20%] shadow-2xl rounded-2xl overflow-hidden relative group">
        <img
          src={albumArt}
          alt="Album Art"
          className="h-full w-full object-cover"
        />
        {/* <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white/80">
          {status}
        </div> */}
      </div>
      {/* Lyrics Section */}
      <div className="m-3 h-[40%] rounded-2xl p-4 shadow-lg overflow-y-auto   backdrop-blur-sm relative">
        {/* <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md px-2 py-2 mb-4 rounded-lg z-10">
          <h3 className="text-white font-semibold text-sm">Lyrics</h3>
          <p className="text-white/50 text-xs">
            {lyrics.length > 0
              ? `${lyrics.length} lines`
              : "No lyrics available"}
          </p>
        </div> */}

        <div ref={lyricsContainerRef} className="space-y-4">
          {lyrics.length > 0 ? (
            lyrics.map((cue, index) => (
              <div
                key={index}
                data-index={index}
                onClick={() => handleLyricClick(cue.start)}
                className={`text-2xl font-bold leading-relaxed cursor-pointer transition-all duration-300 px-2 py-1 rounded-lg relative ${
                  index === currentCueIndex
                    ? "text-white scale-105 bg-white/5"
                    : index < currentCueIndex
                      ? "text-gray-600"
                      : "text-gray-500"
                }`}
              >
                {index === currentCueIndex && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-green-500 rounded-r-full" />
                )}
                {cue.text}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-12">
              <div className="text-6xl mb-4">🎤</div>
              <p className="text-lg">No lyrics available</p>
            </div>
          )}
        </div>
      </div>

      {/* Player Controls */}
      <div className="mt-auto">
        {/* Song Info */}
        <div className="px-4">
          <div className="text-white font-semibold text-lg tracking-wide truncate">
            {songInfo.title}
          </div>
          <div className="text-white/60 text-sm truncate">
            {songInfo.artist}
          </div>
        </div>

        {/* Time and Seekbar */}
        <div className="px-4 mt-2">
          <div className="flex justify-between text-white/60 text-xs mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          {(() => {
            const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
            const safeProgress = isFinite(progress) ? progress : 0;
            const bufferedProgress =
              duration > 0 ? (buffered / duration) * 100 : 0;
            const safeBufferedProgress = isFinite(bufferedProgress)
              ? Math.max(safeProgress, bufferedProgress)
              : safeProgress;

            return (
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                style={
                  {
                    "--track-bg": `linear-gradient(to right, #22c55e ${safeProgress}%, #fff ${safeProgress}%, #fff ${safeBufferedProgress}%, #333 ${safeBufferedProgress}%)`,
                  } as React.CSSProperties
                }
              />
            );
          })()}
        </div>

        {/* Bitrate indicator */}
        {currentBitrate && (
          <div className="px-4 mt-2 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white/50 text-xs">
              Streaming at {currentBitrate} kbps
            </span>
          </div>
        )}

        {/* Quality Selector */}
        {qualityLevels.length > 0 && (
          <div className="px-4 mt-3 relative">
            <div
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-2.5 cursor-pointer hover:bg-white/15 transition-all"
            >
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-black font-bold text-xs">
                {getQualityDisplay()}
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold">
                  {currentQuality === -1
                    ? "Auto Quality"
                    : `${getQualityMeta(qualityLevels[currentQuality].bitrate).label} Quality`}
                </div>
                <div className="text-white/50 text-xs">
                  {currentQuality === -1
                    ? "Best for your connection"
                    : getQualityMeta(qualityLevels[currentQuality].bitrate)
                        .desc}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-white/50 transition-transform ${
                  showQualityMenu ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* Quality Dropdown */}
            {showQualityMenu && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                <div
                  onClick={() => setQuality(-1)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-all ${
                    currentQuality === -1
                      ? "bg-green-500/10 border-l-4 border-green-500"
                      : ""
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full border-2 ${
                      currentQuality === -1
                        ? "border-green-500 bg-green-500"
                        : "border-white/30"
                    }`}
                  />
                  <div className="flex-1">
                    <div
                      className={`text-sm font-semibold ${currentQuality === -1 ? "text-green-500" : "text-white"}`}
                    >
                      Auto
                    </div>
                    <div className="text-white/40 text-xs">
                      Best for your connection
                    </div>
                  </div>
                  <div
                    className={`text-xs font-bold px-2 py-1 rounded ${currentQuality === -1 ? "bg-green-500/20 text-green-500" : "bg-white/5 text-white/40"}`}
                  >
                    AUTO
                  </div>
                </div>

                {qualityLevels
                  .map((level, index) => ({ ...level, index }))
                  .sort((a, b) => b.bitrate - a.bitrate)
                  .map((level) => {
                    const meta = getQualityMeta(level.bitrate);
                    return (
                      <div
                        key={level.index}
                        onClick={() => setQuality(level.index)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-all ${
                          currentQuality === level.index
                            ? "bg-green-500/10 border-l-4 border-green-500"
                            : ""
                        }`}
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full border-2 ${
                            currentQuality === level.index
                              ? "border-green-500 bg-green-500"
                              : "border-white/30"
                          }`}
                        />
                        <div className="flex-1">
                          <div
                            className={`text-sm font-semibold ${currentQuality === level.index ? "text-green-500" : "text-white"}`}
                          >
                            {meta.label}
                          </div>
                          <div className="text-white/40 text-xs">
                            {meta.desc}
                          </div>
                        </div>
                        <div
                          className={`text-xs font-bold px-2 py-1 rounded ${currentQuality === level.index ? "bg-green-500/20 text-green-500" : "bg-white/5 text-white/40"}`}
                        >
                          {meta.icon}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Playback Controls */}

        <div className="flex gap-6 items-center justify-center py-4 text-white">
          {mounted && (
            <Popover
              open={isPlaylistPopoverOpen}
              onOpenChange={setIsPlaylistPopoverOpen}
            >
              <PopoverTrigger asChild>
                <button className="outline-none">
                  <ListPlus className="w-5 h-5 cursor-pointer hover:text-green-400 transition-colors" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="center">
                <PopoverHeader>
                  <PopoverTitle>Choose playlist</PopoverTitle>
                  <PopoverDescription>
                    This song will be added in the choosen playlist
                  </PopoverDescription>
                </PopoverHeader>
                <div className="flex flex-col gap-2 mt-4">
                  {userPlaylists.map((playlist, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="justify-start hover:bg-white/10"
                      onClick={() => {
                        addSongInUserPlaylist(playlist.id, playlist.name);
                      }}
                    >
                      {playlist.name}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <SkipBack
            onClick={playPreviousSong}
            className="w-5 h-5 cursor-pointer hover:text-green-400 transition-colors"
          />
          <div
            onClick={togglePlay}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-black" fill="black" />
            ) : (
              <Play className="w-6 h-6 text-black ml-0.5" fill="black" />
            )}
          </div>
          <SkipForward
            onClick={playNextSong}
            className="w-5 h-5 cursor-pointer hover:text-green-400 transition-colors"
          />
          <Heart
            onClick={handleToggleFavourite}
            className={`w-5 h-5 cursor-pointer transition-all ${
              isLiked
                ? "text-red-500 fill-red-500"
                : "hover:text-red-500 hover:fill-red-500"
            }`}
          />
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2 px-4 pb-4">
          {(() => {
            const volProgress = isMuted ? 0 : volume * 100;
            const safeVolProgress = isFinite(volProgress) ? volProgress : 0;
            return (
              <input
                type="range"
                min="0"
                max="100"
                value={volProgress}
                onChange={handleVolumeChange}
                className="flex-1 h-1 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                style={
                  {
                    "--track-bg": `linear-gradient(to right, #22c55e ${safeVolProgress}%, #333 ${safeVolProgress}%)`,
                  } as React.CSSProperties
                }
              />
            );
          })()}
          {isMuted || volume === 0 ? (
            <VolumeX
              onClick={toggleMute}
              className="w-5 h-5 text-white cursor-pointer hover:text-green-400 transition-colors"
            />
          ) : (
            <Volume2
              onClick={toggleMute}
              className="w-5 h-5 text-white cursor-pointer hover:text-green-400 transition-colors"
            />
          )}
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

export default RightSide;
