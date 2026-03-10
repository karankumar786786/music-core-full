import { Injectable } from '@nestjs/common';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchService {
    private prisma = getPrismaClient();

    async globalSearch(query: string, paginationQuery: PaginationQueryDto) {
        const searchString = query.toLowerCase().trim();
        const { page = 1, limit = 10 } = paginationQuery;
        const skip = (page - 1) * limit;

        const similarityThreshold = 0.2;

        const [songs, artists, playlists] = await Promise.all([
            this.prisma.$queryRaw<any[]>(Prisma.sql`
                SELECT *,
                    GREATEST(
                        public.similarity(title,        ${searchString}::text),
                        public.similarity("artistName", ${searchString}::text),
                        public.similarity(genre,        ${searchString}::text),
                        public.word_similarity(${searchString}::text, title),
                        public.word_similarity(${searchString}::text, "artistName")
                    ) AS score
                FROM "Song"
                WHERE
                    public.similarity(title,        ${searchString}::text) > ${similarityThreshold}::float
                    OR public.similarity("artistName", ${searchString}::text) > ${similarityThreshold}::float
                    OR public.similarity(genre,      ${searchString}::text) > ${similarityThreshold}::float
                    OR public.word_similarity(${searchString}::text, title)        > ${similarityThreshold}::float
                    OR public.word_similarity(${searchString}::text, "artistName") > ${similarityThreshold}::float
                ORDER BY score DESC
                LIMIT  ${limit}
                OFFSET ${skip}
            `),

            this.prisma.$queryRaw<any[]>(Prisma.sql`
                SELECT *,
                    GREATEST(
                        public.similarity("artistName", ${searchString}::text),
                        public.word_similarity(${searchString}::text, "artistName")
                    ) AS score
                FROM "Artist"
                WHERE
                    public.similarity("artistName", ${searchString}::text) > ${similarityThreshold}::float
                    OR public.word_similarity(${searchString}::text, "artistName") > ${similarityThreshold}::float
                ORDER BY score DESC
                LIMIT  ${limit}
                OFFSET ${skip}
            `),

            this.prisma.$queryRaw<any[]>(Prisma.sql`
                SELECT *,
                    GREATEST(
                        public.similarity(title,       ${searchString}::text),
                        public.similarity(description, ${searchString}::text),
                        public.word_similarity(${searchString}::text, title)
                    ) AS score
                FROM "Playlist"
                WHERE
                    public.similarity(title,       ${searchString}::text) > ${similarityThreshold}::float
                    OR public.similarity(description, ${searchString}::text) > ${similarityThreshold}::float
                    OR public.word_similarity(${searchString}::text, title) > ${similarityThreshold}::float
                ORDER BY score DESC
                LIMIT  ${limit}
                OFFSET ${skip}
            `),
        ]);

        const strip = <T extends { score?: unknown }>(rows: T[]): Omit<T, 'score'>[] =>
            rows.map(({ score: _score, ...rest }) => rest);

        return {
            data: {
                songs: strip(songs),
                artists: strip(artists),
                playlists: strip(playlists),
            },
            meta: {
                page: Number(page),
                limit: Number(limit),
            },
        };
    }
}