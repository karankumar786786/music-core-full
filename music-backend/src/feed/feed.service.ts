import { Injectable, Logger } from '@nestjs/common';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';
// @ts-ignore — recombee-api-client ships CJS; types are bundled
import * as recombee from 'recombee-api-client';

const { ApiClient, requests } = recombee;

const recombeeClient = new ApiClient(
    'one-org-one-melody',
    'pN8aXBwXNHjUJyceeab9si9keRB8bDNyYFdrWpqmddXScnoLcG8jGf7r9PkdX1jR',
    { region: 'eu-west' }
);

const RECOMMENDATION_LIMIT = 15;

@Injectable()
export class FeedService {
    private readonly logger = new Logger(FeedService.name);
    private prisma = getPrismaClient();

    async getUserFeed(userId: number, extraExcludeIds: string[] = []) {
        this.logger.log(`Fetching Recombee feed for userId=${userId}, excluding ${extraExcludeIds.length} songs`);

        try {
            // Build the Recombee RecommendItemsToUser request
            const recombeeRequest = new requests.RecommendItemsToUser(
                String(userId),
                RECOMMENDATION_LIMIT,
                {
                    // Pass already-queued song IDs as booster to avoid re-recommending them
                    filter: extraExcludeIds.length > 0
                        ? `NOT('itemId' IN {${extraExcludeIds.map(id => `"${id}"`).join(',')}})` 
                        : undefined,
                    returnProperties: false,
                    includedProperties: ['itemId'],
                }
            );

            const recombeeResponse = await recombeeClient.send(recombeeRequest);
            const songIds: string[] = (recombeeResponse?.recomms ?? [])
                .map((r: any) => String(r.id))
                .filter(Boolean);

            this.logger.log(`Recombee returned ${songIds.length} recommendations for user ${userId}`);

            if (!songIds || songIds.length === 0) {
                return await this.getFallbackFeed();
            }

            // Hydrate from Postgres
            const songs = await this.prisma.song.findMany({
                where: { id: { in: songIds } },
            });

            // Maintain Recombee's ranked order
            const orderedSongs = songIds
                .map((id) => songs.find((s) => s.id === id))
                .filter(Boolean);

            return { data: orderedSongs };
        } catch (error) {
            this.logger.error(
                'Recombee recommendation failed, falling back to recent songs',
                error instanceof Error ? error.stack : undefined,
            );
            return await this.getFallbackFeed();
        }
    }

    private async getFallbackFeed() {
        const fallbackSongs = await this.prisma.song.findMany({
            orderBy: { releaseDate: 'desc' },
            take: RECOMMENDATION_LIMIT,
        });
        return { data: fallbackSongs };
    }
}
