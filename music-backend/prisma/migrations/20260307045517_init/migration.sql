-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profilePictureKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "isrc" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "vectorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" SERIAL NOT NULL,
    "artistName" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playlist" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistSongs" (
    "id" SERIAL NOT NULL,
    "playlistId" INTEGER NOT NULL,
    "songId" INTEGER NOT NULL,

    CONSTRAINT "PlaylistSongs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlaylist" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "UserPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlaylistSongs" (
    "id" SERIAL NOT NULL,
    "songId" INTEGER NOT NULL,
    "playlistId" INTEGER NOT NULL,

    CONSTRAINT "UserPlaylistSongs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSearchHistory" (
    "id" SERIAL NOT NULL,
    "searchString" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "songId" INTEGER NOT NULL,
    "songVectorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongProcessingJob" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "isrc" TEXT NOT NULL,
    "vectorId" TEXT,
    "tempSongKey" TEXT NOT NULL,
    "tempSongImageKey" TEXT NOT NULL,
    "processedKey" TEXT,
    "genre" TEXT,
    "transcribed" BOOLEAN NOT NULL DEFAULT false,
    "transcoded" BOOLEAN NOT NULL DEFAULT false,
    "extractedAudioFeatures" BOOLEAN NOT NULL DEFAULT false,
    "generatedEmbeddings" BOOLEAN NOT NULL DEFAULT false,
    "processingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "updatedSongTable" BOOLEAN NOT NULL DEFAULT false,
    "processedImages" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "transcribedAttempts" INTEGER NOT NULL DEFAULT 0,
    "transcodedAttempts" INTEGER NOT NULL DEFAULT 0,
    "extractedAudioFeaturesAttempts" INTEGER NOT NULL DEFAULT 0,
    "generatedEmbeddingsAttempts" INTEGER NOT NULL DEFAULT 0,
    "updatedSongTableAttempts" INTEGER NOT NULL DEFAULT 0,
    "processedImagesAttempts" INTEGER NOT NULL DEFAULT 0,
    "currentStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistProcessingJob" (
    "id" SERIAL NOT NULL,
    "artistName" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "tempKey" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "scaledImage" BOOLEAN NOT NULL DEFAULT false,
    "processingAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistProcessingJob" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tempKey" TEXT NOT NULL,
    "scaledImage" BOOLEAN NOT NULL DEFAULT false,
    "processingAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaylistProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavourites" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "songId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavourites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Song_title_key" ON "Song"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Song_vectorId_key" ON "Song"("vectorId");

-- CreateIndex
CREATE INDEX "PlaylistSongs_playlistId_idx" ON "PlaylistSongs"("playlistId");

-- CreateIndex
CREATE INDEX "PlaylistSongs_songId_idx" ON "PlaylistSongs"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistSongs_playlistId_songId_key" ON "PlaylistSongs"("playlistId", "songId");

-- CreateIndex
CREATE INDEX "UserPlaylist_userId_idx" ON "UserPlaylist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPlaylist_title_userId_key" ON "UserPlaylist"("title", "userId");

-- CreateIndex
CREATE INDEX "UserPlaylistSongs_playlistId_idx" ON "UserPlaylistSongs"("playlistId");

-- CreateIndex
CREATE INDEX "UserPlaylistSongs_songId_idx" ON "UserPlaylistSongs"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPlaylistSongs_songId_playlistId_key" ON "UserPlaylistSongs"("songId", "playlistId");

-- CreateIndex
CREATE INDEX "UserSearchHistory_userId_idx" ON "UserSearchHistory"("userId");

-- CreateIndex
CREATE INDEX "UserHistory_userId_idx" ON "UserHistory"("userId");

-- CreateIndex
CREATE INDEX "UserHistory_songId_idx" ON "UserHistory"("songId");

-- CreateIndex
CREATE INDEX "UserFavourites_userId_idx" ON "UserFavourites"("userId");

-- CreateIndex
CREATE INDEX "UserFavourites_songId_idx" ON "UserFavourites"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavourites_userId_songId_key" ON "UserFavourites"("userId", "songId");

-- AddForeignKey
ALTER TABLE "PlaylistSongs" ADD CONSTRAINT "PlaylistSongs_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistSongs" ADD CONSTRAINT "PlaylistSongs_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlaylist" ADD CONSTRAINT "UserPlaylist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlaylistSongs" ADD CONSTRAINT "UserPlaylistSongs_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlaylistSongs" ADD CONSTRAINT "UserPlaylistSongs_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "UserPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSearchHistory" ADD CONSTRAINT "UserSearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHistory" ADD CONSTRAINT "UserHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHistory" ADD CONSTRAINT "UserHistory_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavourites" ADD CONSTRAINT "UserFavourites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavourites" ADD CONSTRAINT "UserFavourites_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
