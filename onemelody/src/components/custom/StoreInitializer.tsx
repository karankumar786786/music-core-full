"use client";

import { useEffect } from "react";
import { useAllSongsStore } from "@/Store/AllSongsStore";
import { useAllPlaylistStore } from "@/Store/AllPlaylistStore";
import { useAllArtistsStore } from "@/Store/AllArtistsStore";
import { useArtistSongsStore } from "@/Store/ArtistSongs";
import { useAllPlaylistSongsStore } from "@/Store/PlaylistSongs";
import { useAllUserPlaylistStore } from "@/Store/AllUserPlaylistStore";
import { useAllUserPlaylistSongsStore } from "@/Store/UserPlaylistSongs";
import { useUserFavouriteSongsStore } from "@/Store/UserFavouriteSongsStore";
import { useUserHistorySongsStore } from "@/Store/UserHistorySongsStore";
import { useUserStore } from "@/Store/UserStore";
import { listAllSongs } from "@/app/server/listSongs";
import { listAllArtists } from "@/app/server/listArtists";
import { listSystemPlaylists } from "@/app/server/listSystemPlaylists";
import { listUserPlaylists } from "@/app/server/listUserPlaylists";
import { listUserFavourites } from "@/app/server/listUserFavourites";
import { listUserHistory } from "@/app/server/listUserHistory";

export function StoreInitializer() {
  const setSongs = useAllSongsStore((state) => state.setSongs);
  const setPlaylists = useAllPlaylistStore((state) => state.setPlaylists);
  const setArtists = useAllArtistsStore((state) => state.setArtists);
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    // Load all data from server
    const loadData = async () => {
      try {
        // Load all songs
        const songsData = await listAllSongs();
        const songs = songsData.map((song) => ({
          id: song.id.toString(),
          title: song.title,
          artist: song.artist_stage_name,
          coverImageUrl: song.coverImageUrl || "",
          songBaseUrl: song.songUrl || "",
          duration: song.duration?.toString(),
        }));
        setSongs(songs);

        // Load all artists
        const artists = await listAllArtists();
        setArtists(
          artists.map((artist) => ({
            id: artist.id.toString(),
            artistName: artist.stage_name,
            coverImageUrl: artist.profileImageUrl || "",
          })),
        );

        // Load system playlists
        const systemPlaylists = await listSystemPlaylists();
        setPlaylists(
          systemPlaylists.map((playlist) => ({
            id: playlist.id.toString(),
            name: playlist.playlistName,
            count: 0, // Count would need to be calculated or added to the query
            coverImageUrl: playlist.playlistCoverImageUrl || "",
          })),
        );

        // Load user playlists
        const userPlaylists = await listUserPlaylists();
        const setAllUserPlaylists =
          useAllUserPlaylistStore.getState().setUserPlaylists;
        setAllUserPlaylists(
          userPlaylists.map((playlist) => ({
            id: playlist.id.toString(),
            name: playlist.playlist_name,
            count: 0, // Count would need to be calculated or added to the query
            coverImageUrl: "", // User playlists don't have cover images in the schema
          })),
        );

        // Load user favourites
        const favouritesData = await listUserFavourites();
        const favourites = favouritesData
          .filter((song) => song) // Filter out any null/undefined
          .map((song) => ({
            id: song.id.toString(),
            title: song.title,
            artist: song.artist_stage_name,
            coverImageUrl: song.coverImageUrl || "",
            songBaseUrl: song.songUrl || "",
            duration: song.duration?.toString(),
          }));
        const setFavourites =
          useUserFavouriteSongsStore.getState().setFavouriteSongs;
        setFavourites(favourites);

        // Load user history
        const historyData = await listUserHistory();
        const history = historyData
          .filter((song) => song) // Filter out any null/undefined
          .map((song) => ({
            id: song.id.toString(),
            title: song.title,
            artist: song.artist_stage_name,
            coverImageUrl: song.coverImageUrl || "",
            songBaseUrl: song.songUrl || "",
            duration: song.duration?.toString(),
          }));
        const setHistory = useUserHistorySongsStore.getState().setHistorySongs;
        setHistory(history);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [setSongs, setPlaylists, setArtists, setUser]);

  return null;
}
