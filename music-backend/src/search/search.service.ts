import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchService {
    private prisma = getPrismaClient();

    constructor(@Inject(CACHE_MANAGER) private cache: Cache) { }

    private getCacheKey(query: string, page: number, limit: number) {
        return `search:${query}:${page}:${limit}`;
    }

    async globalSearch(query: string, paginationQuery: PaginationQueryDto) {
        const searchString = query.toLowerCase().trim();
        const { page = 1, limit = 10 } = paginationQuery;
        const skip = (page - 1) * limit;

        if (searchString.length < 3) {
            return {
                data: { songs: [], artists: [], playlists: [] },
                meta: { page: Number(page), limit: Number(limit), hasMore: { songs: false, artists: false, playlists: false } }
            };
        }

        const cacheKey = this.getCacheKey(searchString, page, limit);
        const cached = await this.cache.get(cacheKey);
        if (cached) return cached;

        const threshold = 0.2;

        // % in WHERE → uses GIN index (fast candidate fetch)
        // similarity() in CTE's WHERE → applies our exact threshold post-index
        // similarity() in SELECT → scoring only, runs on small filtered set
        const [songs, artists, playlists] = await Promise.all([
            this.prisma.$queryRaw<any[]>(Prisma.sql`
                WITH candidates AS (
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
                        title          % ${searchString}::text
                        OR "artistName" % ${searchString}::text
                        OR genre        % ${searchString}::text
                        OR ${searchString}::text <% title
                        OR ${searchString}::text <% "artistName"
                )
                SELECT * FROM candidates
                WHERE score > ${threshold}::float
                ORDER BY score DESC
                LIMIT  ${limit}
                OFFSET ${skip}
            `),

            this.prisma.$queryRaw<any[]>(Prisma.sql`
                WITH candidates AS (
                    SELECT
                        id, "artistName", bio, "storageKey", dob,
                        GREATEST(
                            public.similarity("artistName", ${searchString}::text),
                            public.word_similarity(${searchString}::text, "artistName")
                        ) AS score
                    FROM "Artist"
                    WHERE
                        "artistName" % ${searchString}::text
                        OR ${searchString}::text <% "artistName"
                )
                SELECT * FROM candidates
                WHERE score > ${threshold}::float
                ORDER BY score DESC
                LIMIT  ${limit}
                OFFSET ${skip}
            `),

            this.prisma.$queryRaw<any[]>(Prisma.sql`
                WITH candidates AS (
                    SELECT
                        id, title, description, "storageKey",
                        GREATEST(
                            public.similarity(title,       ${searchString}::text),
                            public.similarity(description, ${searchString}::text),
                            public.word_similarity(${searchString}::text, title)
                        ) AS score
                    FROM "Playlist"
                    WHERE
                        title          % ${searchString}::text
                        OR description % ${searchString}::text
                        OR ${searchString}::text <% title
                )
                SELECT * FROM candidates
                WHERE score > ${threshold}::float
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
                hasMore: {
                    songs: songs.length === limit,
                    artists: artists.length === limit,
                    playlists: playlists.length === limit,
                },
            },
        };

        await this.cache.set(cacheKey, result);

        return result;
    }
}