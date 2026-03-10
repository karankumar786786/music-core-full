import { Injectable } from '@nestjs/common';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';

const RECOMMENDATION_ENGINE_URL =
    process.env.RECOMMENDATION_ENGINE_URL || 'http://127.0.0.1:8000';

@Injectable()
export class FeedService {
    private prisma = getPrismaClient();

    async getUserFeed(userId: number, extraExcludeIds: string[] = []) {
        // 1. Fetch user's recent history (expanded window) and favourites
        const history = await this.prisma.userHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { songVectorId: true, songId: true },
        });

        const favourites = await this.prisma.userFavourites.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 30,
            include: { song: { select: { vectorId: true, id: true } } },
        });

        // 2. Build weighted signals with recency decay
        const rawSignals: { vectorId: string, weight: number }[] = [];
        const excludeSongIds = new Set<string>();

        // Gentle recency decay: newest = 1.2, oldest = 0.8
        // Keeps overall listening pattern dominant — not just the last song
        const historyCount = history.length;
        history.forEach((h, index) => {
            if (h.songVectorId) {
                const decay = 1.2 - 0.4 * (index / Math.max(historyCount - 1, 1));
                rawSignals.push({ vectorId: h.songVectorId, weight: decay });
            }
            if (h.songId) excludeSongIds.add(h.songId);
        });

        // Favourites get a strong explicit boost
        favourites.forEach((f) => {
            if (f.song?.vectorId) {
                rawSignals.push({ vectorId: f.song.vectorId, weight: 3.0 });
            }
            if (f.songId) excludeSongIds.add(f.songId);
        });

        // 3. Deduplicate: keep highest weight per unique vectorId
        const bestByVector = new Map<string, number>();
        for (const s of rawSignals) {
            const existing = bestByVector.get(s.vectorId) ?? 0;
            if (s.weight > existing) bestByVector.set(s.vectorId, s.weight);
        }
        const signals = Array.from(bestByVector.entries()).map(
            ([vectorId, weight]) => ({ vectorId, weight })
        );

        // Also exclude songs the frontend already has in its queue
        for (const id of extraExcludeIds) {
            excludeSongIds.add(id);
        }

        const excludeIdsArray = Array.from(excludeSongIds);

        console.log(`[FeedService] User ${userId}: ${signals.length} unique signals (from ${rawSignals.length} raw), excluding ${excludeIdsArray.length} songs (${extraExcludeIds.length} from queue)`);

        if (signals.length === 0) {
            const fallbackSongs = await this.prisma.song.findMany({
                orderBy: { releaseDate: 'desc' },
                take: 8,
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
                    limit: 8,
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
                    take: 8,
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
