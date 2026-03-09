import { Injectable } from '@nestjs/common';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class SearchService {
    private prisma = getPrismaClient();

    // Utility: Native Levenshtein Distance for strict typo tolerance without NPM dependencies
    private calculateLevenshteinDistance(a: string, b: string): number {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix: number[][] = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }

    // Utility: Check if any of the target fields loosely matches the query
    private looselyMatches(query: string, fields: string[], maxDistance = 3): boolean {
        const qWords = query.toLowerCase().split(' ').filter(Boolean);

        for (const field of fields) {
            if (!field) continue;
            const fWords = field.toLowerCase().split(' ').filter(Boolean);

            // If the query exactly substring matches anywhere, accept it (e.g., 'just' in 'justin')
            if (field.toLowerCase().includes(query.toLowerCase())) return true;

            // Otherwise, check for typos using Levenshtein distance per word
            for (const qWord of qWords) {
                for (const fWord of fWords) {
                    if (this.calculateLevenshteinDistance(qWord, fWord) <= maxDistance) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    async globalSearch(query: string, paginationQuery: PaginationQueryDto) {
        const searchString = query.toLowerCase();
        const { page = 1, limit = 10 } = paginationQuery;
        const skip = (page - 1) * limit;

        // 1. Fetch a broader "Candidate Pool" from the DB (using GIN indexes)
        // We use a safe 'contains' on the first 3 letters if the query is long enough
        // This leverages our GIN `pg_trgm` indexes rapidly.
        const dbLookupString = searchString.length >= 3 ? searchString.substring(0, 3) : searchString;

        const [candidateSongs, candidateArtists, candidatePlaylists] = await Promise.all([
            // Songs
            this.prisma.song.findMany({
                where: {
                    OR: [
                        { title: { contains: dbLookupString, mode: 'insensitive' } },
                        { artistName: { contains: dbLookupString, mode: 'insensitive' } },
                        { genre: { contains: dbLookupString, mode: 'insensitive' } },
                    ],
                },
                take: 150, // Grab a larger candidate pool for fuzzy matching
            }),

            // Artists
            this.prisma.artist.findMany({
                where: {
                    artistName: { contains: dbLookupString, mode: 'insensitive' },
                },
                take: 50,
            }),

            // Playlists
            this.prisma.playlist.findMany({
                where: {
                    OR: [
                        { title: { contains: dbLookupString, mode: 'insensitive' } },
                        { description: { contains: dbLookupString, mode: 'insensitive' } },
                    ],
                },
                take: 50,
            }),
        ]);

        // 2. Apply NATIVE Fuzzy Matching on the Candidate Pools to handle Typos!
        const maxTypoTolerance = Math.max(1, Math.floor(searchString.length / 3));

        const matchedSongs = candidateSongs
            .filter(song => this.looselyMatches(searchString, [song.title, song.artistName, song.genre], maxTypoTolerance));

        const matchedArtists = candidateArtists
            .filter(artist => this.looselyMatches(searchString, [artist.artistName], maxTypoTolerance));

        const matchedPlaylists = candidatePlaylists
            .filter(playlist => this.looselyMatches(searchString, [playlist.title, playlist.description], maxTypoTolerance));

        // 3. Paginate the locally matched arrays
        const songs = matchedSongs.slice(skip, skip + limit);
        const artists = matchedArtists.slice(skip, skip + limit);
        const playlists = matchedPlaylists.slice(skip, skip + limit);

        return {
            data: {
                songs,
                artists,
                playlists,
            },
            meta: {
                page: Number(page),
                limit: Number(limit)
            }
        };
    }
}
