import { Test, TestingModule } from '@nestjs/testing';
import { ArtistsController } from './artists.controller';
import { ArtistsService } from './artists.service';

describe('ArtistsController', () => {
    let controller: ArtistsController;
    let service: ArtistsService;

    const mockArtistsService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        getSongsByArtist: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ArtistsController],
            providers: [
                {
                    provide: ArtistsService,
                    useValue: mockArtistsService,
                },
            ],
        }).compile();

        controller = module.get<ArtistsController>(ArtistsController);
        service = module.get<ArtistsService>(ArtistsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should call artistsService.create with correct data', async () => {
            const createArtistDto = {
                artistName: 'Test Artist',
                bio: 'Test Bio',
                dob: new Date('1990-01-01').toISOString(),
                tempCoverImageKey: 'songs/Screenshot 2026-03-04 at 9.56.26 PM.png',
                tempBannerImageKey: 'songs/Screenshot 2026-03-04 at 9.56.26 PM.png',
            };
            mockArtistsService.create.mockResolvedValue('artist-id');
            const result = await controller.create(createArtistDto as any);
            expect(service.create).toHaveBeenCalledWith(createArtistDto);
            expect(result).toBe('artist-id');
        });
    });

    describe('findAll', () => {
        it('should call artistsService.findAll with paginationQuery', async () => {
            const paginationQuery = { page: 1, limit: 10 };
            mockArtistsService.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });
            const result = await controller.findAll(paginationQuery);
            expect(service.findAll).toHaveBeenCalledWith(paginationQuery);
            expect(result).toEqual({ data: [], meta: { total: 0 } });
        });
    });

    describe('findOne', () => {
        it('should call artistsService.findOne with id', async () => {
            const id = '123';
            mockArtistsService.findOne.mockResolvedValue({ id, name: 'Test' });
            const result = await controller.findOne(id);
            expect(service.findOne).toHaveBeenCalledWith(id);
            expect(result).toEqual({ id, name: 'Test' });
        });
    });

    describe('getSongs', () => {
        it('should call artistsService.getSongsByArtist with id and paginationQuery', async () => {
            const id = '123';
            const paginationQuery = { page: 1, limit: 10 };
            mockArtistsService.getSongsByArtist.mockResolvedValue({ data: [], meta: { total: 0 } });
            const result = await controller.getSongs(id, paginationQuery);
            expect(service.getSongsByArtist).toHaveBeenCalledWith(id, paginationQuery);
            expect(result).toEqual({ data: [], meta: { total: 0 } });
        });
    });

    describe('remove', () => {
        it('should call artistsService.remove with id', async () => {
            const id = '123';
            mockArtistsService.remove.mockResolvedValue({ deleted: true });
            const result = await controller.remove(id);
            expect(service.remove).toHaveBeenCalledWith(id);
            expect(result).toEqual({ deleted: true });
        });
    });
});
