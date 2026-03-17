import { Test, TestingModule } from '@nestjs/testing';
import { InteractionService } from './interaction.service';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

const mockPrismaClient = {
    song: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
    userHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
    },
    userFavourites: {
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
    userSearchHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
};

jest.mock('../lib/helpers/prisma/getPrismaClient', () => ({
    getPrismaClient: () => mockPrismaClient,
}));

jest.mock('../lib/helpers/signature/signature.utility', () => ({
    SignatureUtility: {
        verifyId: jest.fn(),
    },
}));

import { SignatureUtility } from '../lib/helpers/signature/signature.utility';

describe('InteractionService', () => {
    let service: InteractionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [InteractionService],
        }).compile();

        service = module.get<InteractionService>(InteractionService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('addView', () => {
        it('should throw UnauthorizedException if songId signature is invalid', async () => {
            (SignatureUtility.verifyId as jest.Mock).mockReturnValue(false);
            await expect(service.addView(1, { songId: 'bad-id' })).rejects.toThrow(UnauthorizedException);
        });

        it('should throw NotFoundException if song does not exist', async () => {
            (SignatureUtility.verifyId as jest.Mock).mockReturnValue(true);
            mockPrismaClient.song.findUnique.mockResolvedValue(null);
            await expect(service.addView(1, { songId: 'good-id' })).rejects.toThrow(NotFoundException);
        });

        it('should create user history if valid', async () => {
            (SignatureUtility.verifyId as jest.Mock).mockReturnValue(true);
            mockPrismaClient.song.findUnique.mockResolvedValue({ id: 'good-id', vectorId: 'vec-1' });
            mockPrismaClient.userHistory.create.mockResolvedValue({ id: 1 });

            const result = await service.addView(1, { songId: 'good-id' });
            expect(result).toEqual({ id: 1 });
            expect(mockPrismaClient.userHistory.create).toHaveBeenCalledWith({
                data: { userId: 1, songId: 'good-id', songVectorId: 'vec-1' },
            });
        });
    });

    describe('getHistory & getFavourites', () => {
        it('getHistory should return data and meta with defaults', async () => {
            mockPrismaClient.userHistory.findMany.mockResolvedValue([{ id: 1 }]);
            mockPrismaClient.userHistory.count.mockResolvedValue(1);

            const result = await service.getHistory(1, { page: 1, limit: 10 });
            expect(result.data).toHaveLength(1);
            expect(result.meta).toEqual({ page: 1, limit: 10, total: 1 });
        });

        it('getFavourites should return data and meta with pagination', async () => {
            mockPrismaClient.userFavourites.findMany.mockResolvedValue([{ id: 2 }]);
            mockPrismaClient.userFavourites.count.mockResolvedValue(5);

            const result = await service.getFavourites(1, { page: 2, limit: 2 });
            expect(result.data).toHaveLength(1);
            expect(result.meta).toEqual({ page: 2, limit: 2, total: 5 });
            expect(mockPrismaClient.userFavourites.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 2, take: 2 })
            );
        });
    });

    describe('Trending and Featured', () => {
        it('getTrending should aggregate userHistory and hydrate songs', async () => {
            const topInteracted = [{ songId: 's1', _count: { songId: 10 } }];
            const uniqueGroup = [{ songId: 's1' }, { songId: 's2' }];
            const songs = [{ id: 's1', title: 'test song' }];

            mockPrismaClient.userHistory.groupBy
                .mockResolvedValueOnce(topInteracted)
                .mockResolvedValueOnce(uniqueGroup);

            mockPrismaClient.song.findMany.mockResolvedValue(songs);

            const result = await service.getTrending({ page: 1, limit: 10 });
            expect(result.data).toEqual(songs);
            expect(result.meta.total).toBe(2);
            expect(result.meta.page).toBe(1);
        });

        it('getFeatured should pull 5 newest songs', async () => {
            const songs = Array.from({ length: 5 }).map((_, i) => ({ id: `s${i}` }));
            mockPrismaClient.song.findMany.mockResolvedValue(songs);

            const result = await service.getFeatured();
            expect(result.data).toHaveLength(5);
            expect(result.meta.limit).toBe(5);
            expect(mockPrismaClient.song.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 5, orderBy: { createdAt: 'desc' } })
            );
        });
    });
});
