import { Injectable } from '@nestjs/common';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchService {
    private prisma = getPrismaClient();

    // Simple in-memory cache: query -> { data, expiresAt }
    // Replace with Redis in production for multi-instance deployments
    private cache = new Map<string, { data: any; expiresAt: number }>();
    private readonly CACHE_TTL_MS = 30_000; // 30 seconds

    private getCacheKey(query: string, page: number, limit: number) {
        return `search:${query}:${page}:${limit}`;
    }

    async globalSearch(query: string, paginationQuery: PaginationQueryDto) {
        const searchString = query.toLowerCase().trim();
        const { page = 1, limit = 10 } = paginationQuery;
        const skip = (page - 1) * limit;


        // 1. Check cache first
        const cacheKey = this.getCacheKey(searchString, page, limit);
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }

        const threshold = 0.2;

        // 2. Perform search using session-independent similarity filtering
        const [songs, artists, playlists] = await Promise.all([
            this.prisma.$queryRaw<any[]>(Prisma.sql`
                SELECT
                    id, title, "artistName", genre, "durationMs", "releaseDate", "storageKey",
                    GREATEST(
                        public.similarity(title,        ${searchString}::text),
                        public.similarity("artistName", ${searchString}::text),
                        public.similarity(genre,        ${searchString}::text),
                        public.word_similarity(${searchString}::text, title),
                        public.word_similarity(${searchString}::text, "artistName")
                    ) AS score
                FROM "Song"
                WHERE
                    public.similarity(title,        ${searchString}::text) > ${threshold}::float
                    OR public.similarity("artistName", ${searchString}::text) > ${threshold}::float
                    OR public.similarity(genre,        ${searchString}::text) > ${threshold}::float
                    OR public.word_similarity(${searchString}::text, title) > ${threshold}::float
                    OR public.word_similarity(${searchString}::text, "artistName") > ${threshold}::float
                ORDER BY score DESC
                LIMIT  ${limit}
                OFFSET ${skip}
            `),

            this.prisma.$queryRaw<any[]>(Prisma.sql`
                SELECT
                    id, "artistName", bio, "storageKey", dob,
                    GREATEST(
                        public.similarity("artistName", ${searchString}::text),
                        public.word_similarity(${searchString}::text, "artistName")
                    ) AS score
                FROM "Artist"
                WHERE
                    public.similarity("artistName", ${searchString}::text) > ${threshold}::float
                    OR public.word_similarity(${searchString}::text, "artistName") > ${threshold}::float
                ORDER BY score DESC
                LIMIT  ${limit}
                OFFSET ${skip}
            `),

            this.prisma.$queryRaw<any[]>(Prisma.sql`
                SELECT
                    id, title, description, "storageKey",
                    GREATEST(
                        public.similarity(title,       ${searchString}::text),
                        public.similarity(description, ${searchString}::text),
                        public.word_similarity(${searchString}::text, title)
                    ) AS score
                FROM "Playlist"
                WHERE
                    public.similarity(title,       ${searchString}::text) > ${threshold}::float
                    OR public.similarity(description, ${searchString}::text) > ${threshold}::float
                    OR public.word_similarity(${searchString}::text, title) > ${threshold}::float
                ORDER BY score DESC
                LIMIT  ${limit}
                OFFSET ${skip}
            `),
        ]);

        const strip = <T extends { score?: unknown }>(rows: T[]): Omit<T, 'score'>[] =>
            rows.map(({ score: _score, ...rest }) => rest);

        const result = {
            data: {
                songs: strip(songs),
                artists: strip(artists),
                playlists: strip(playlists),
            },
            meta: {
                page: Number(page),
                limit: Number(limit),
                // Tells the frontend whether to keep paginating
                hasMore: songs.length === limit || artists.length === limit || playlists.length === limit,
            },
        };

        // 3. Store in cache
        this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS });

        // 4. Prune stale cache entries periodically (prevent memory leak)
        if (this.cache.size > 500) {
            const now = Date.now();
            for (const [key, val] of this.cache.entries()) {
                if (val.expiresAt < now) this.cache.delete(key);
            }
        }

        return result;
    }
}