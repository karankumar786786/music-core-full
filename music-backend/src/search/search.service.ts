import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Prisma } from '@prisma/client';

interface SearchRow {
    entity_type: 'song' | 'artist' | 'playlist';
    id: string;
    title: string | null;
    artistName: string | null;
    genre: string | null;
    durationMs: number | null;
    releaseDate: Date | null;
    storageKey: string | null;
    bio: string | null;
    dob: Date | null;
    description: string | null;
    score: number;
}

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

        // Single DB call → PostgreSQL function handles UNION ALL, threshold, and pagination internally
        const rows = await this.prisma.$queryRaw<SearchRow[]>(Prisma.sql`
            SELECT * FROM public.global_search(
                ${searchString}::text,
                ${threshold}::float,
                ${limit}::int,
                ${skip}::int
            )
        `);

        // Split by entity_type and strip score
        const songs = rows
            .filter(r => r.entity_type === 'song')
            .map(({ entity_type: _, score: _s, bio: _b, dob: _d, description: _desc, ...rest }) => rest);

        const artists = rows
            .filter(r => r.entity_type === 'artist')
            .map(({ entity_type: _, score: _s, title: _t, genre: _g, durationMs: _dm, releaseDate: _rd, description: _desc, ...rest }) => rest);

        const playlists = rows
            .filter(r => r.entity_type === 'playlist')
            .map(({ entity_type: _, score: _s, artistName: _an, genre: _g, durationMs: _dm, releaseDate: _rd, bio: _b, dob: _d, ...rest }) => rest);

        const result = {
            data: { songs, artists, playlists },
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