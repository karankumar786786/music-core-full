import { Injectable } from '@nestjs/common';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';

const RECOMMENDATION_ENGINE_URL =
    process.env.RECOMMENDATION_ENGINE_URL || 'http://127.0.0.1:8000';

@Injectable()
export class FeedService {
    private prisma = getPrismaClient();

    async getUserFeed(userId: number) {
        // 1. Fetch user's recent history and favourites
        const history = await this.prisma.userHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { songVectorId: true, songId: true },
        });

        const favourites = await this.prisma.userFavourites.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { song: { select: { vectorId: true, id: true } } },
        });

        const signals: { vectorId: string, weight: number }[] = [];
        const excludeSongIds = new Set<string>();

        history.forEach((h) => {
            if (h.songVectorId) {
                signals.push({ vectorId: h.songVectorId, weight: 1.0 });
            }
            if (h.songId) excludeSongIds.add(h.songId);
        });

        favourites.forEach((f) => {
            if (f.song?.vectorId) {
                signals.push({ vectorId: f.song.vectorId, weight: 2.0 });
            }
            if (f.songId) excludeSongIds.add(f.songId);
        });

        const excludeIdsArray = Array.from(excludeSongIds);

        console.log(`[FeedService] User ${userId}: ${signals.length} signals, excluding ${excludeIdsArray.length} songs`);

        if (signals.length === 0) {
            const fallbackSongs = await this.prisma.song.findMany({
                orderBy: { releaseDate: 'desc' },
                take: 15,
            });
            return { data: fallbackSongs };
        }

        try {
            // 2. Call the Python Recommendation Engine directly via HTTP
            const response = await fetch(`${RECOMMENDATION_ENGINE_URL}/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    positiveSignals: signals,
                    excludeSongIds: excludeIdsArray,
                    limit: 15,
                }),
            });

            if (!response.ok) {
                throw new Error(`Recommendation engine returned ${response.status}`);
            }

            const data = await response.json();
            const songIds: string[] = Array.isArray(data?.songIds) ? data.songIds : [];

            console.log(`[FeedService] Recommendation engine returned ${songIds.length} song IDs`);

            if (!songIds || songIds.length === 0) {
                const fallbackSongs = await this.prisma.song.findMany({
                    orderBy: { releaseDate: 'desc' },
                    take: 15,
                });
                return { data: fallbackSongs };
            }

            // 3. Hydrate Songs from Postgres
            const songs = await this.prisma.song.findMany({
                where: { id: { in: songIds } },
            });

            // Maintain the mathematically ranked order returned by Qdrant
            const orderedSongs = songIds
                .map((id) => songs.find((s) => s.id === id))
                .filter(Boolean);
            return { data: orderedSongs };

        } catch (error) {
            console.error(
                'Failed to call Python recommendation engine:',
                error,
            );

            // Fallback on timeout or network error
            const fallbackSongs = await this.prisma.song.findMany({
                orderBy: { releaseDate: 'desc' },
                take: 15,
            });
            return { data: fallbackSongs };
        }
    }
}
