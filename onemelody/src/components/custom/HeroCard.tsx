"use client";
import { useState, useEffect } from "react";
import { Song } from "@/types";
import { useCurrentlyPlayingSongsStore } from "@/Store/CurrentlyPlayingSongsStore";

export function HeroCard({ items }: { items: Array<Song> }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const setCurrentSong = useCurrentlyPlayingSongsStore(
    (state) => state.setCurrentSong,
  );
  const setIsPlaying = useCurrentlyPlayingSongsStore(
    (state) => state.setIsPlaying,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 9000);

    return () => clearInterval(interval);
  }, [items.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  if (!items.length) return null;

  const loadSong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  return (
    <div className="w-[95%] group cursor-pointer relative">
      <div className="relative overflow-hidden rounded-md shadow-md">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className="min-w-full relative"
              onClick={() => {
                loadSong(item);
              }}
            >
              <img
                src={item.coverImageUrl}
                alt={item.title}
                className="w-full h-[240px] md:h-[305px] lg:h-[370px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="absolute bottom-0 left-0 right-0 p-2.5 md:p-4 lg:p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <h2 className="text-white font-bold text-base md:text-xl lg:text-2xl drop-shadow-2xl mb-0.5">
                  {item.title}
                </h2>
                <div className="h-0.5 w-10 bg-white/80 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={goToPrevious}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          aria-label="Previous slide"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          onClick={goToNext}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          aria-label="Next slide"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <div className="flex justify-center gap-1 mt-1.5">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex
                ? "w-4 h-1 bg-white"
                : "w-1 h-1 bg-white/50 hover:bg-white/75"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
