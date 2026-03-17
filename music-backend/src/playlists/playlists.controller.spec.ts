import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';

describe('PlaylistsController', () => {
    let controller: PlaylistsController;
    let service: PlaylistsService;

    const mockPlaylistsService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        addSong: jest.fn(),
        removeSong: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PlaylistsController],
            providers: [
                {
                    provide: PlaylistsService,
                    useValue: mockPlaylistsService,
                },
            ],
        }).compile();

        controller = module.get<PlaylistsController>(PlaylistsController);
        service = module.get<PlaylistsService>(PlaylistsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should call playlistsService.create with correct data', async () => {
            const createPlaylistDto = {
                title: 'Test Playlist',
                description: 'Test Description',
                tempCoverImageKey: 'songs/Screenshot 2026-03-04 at 9.56.26 PM.png',
                tempBannerImageKey: 'songs/Screenshot 2026-03-04 at 9.56.26 PM.png',
            };
            mockPlaylistsService.create.mockResolvedValue('playlist-id');
            const result = await controller.create(createPlaylistDto as any);
            expect(service.create).toHaveBeenCalledWith(createPlaylistDto);
            expect(result).toBe('playlist-id');
        });
    });

    describe('findAll', () => {
        it('should call playlistsService.findAll with paginationQuery', async () => {
            const paginationQuery = { page: 1, limit: 10 };
            mockPlaylistsService.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });
            const result = await controller.findAll(paginationQuery);
            expect(service.findAll).toHaveBeenCalledWith(paginationQuery);
            expect(result).toEqual({ data: [], meta: { total: 0 } });
        });
    });

    describe('findOne', () => {
        it('should call playlistsService.findOne with id and paginationQuery', async () => {
            const id = '123';
            const paginationQuery = { page: 1, limit: 10 };
            mockPlaylistsService.findOne.mockResolvedValue({ id, title: 'Test' });
            const result = await controller.findOne(id, paginationQuery);
            expect(service.findOne).toHaveBeenCalledWith(id, paginationQuery);
            expect(result).toEqual({ id, title: 'Test' });
        });
    });

    describe('addSong', () => {
        it('should call playlistsService.addSong with id and addSongToPlaylistDto', async () => {
            const id = '123';
            const addSongToPlaylistDto = { songId: 'song-123' };
            mockPlaylistsService.addSong.mockResolvedValue({ success: true });
            const result = await controller.addSong(id, addSongToPlaylistDto);
            expect(service.addSong).toHaveBeenCalledWith(id, addSongToPlaylistDto);
            expect(result).toEqual({ success: true });
        });
    });

    describe('removeSong', () => {
        it('should call playlistsService.removeSong with id and songId', async () => {
            const id = '123';
            const songId = 'song-123';
            mockPlaylistsService.removeSong.mockResolvedValue({ success: true });
            const result = await controller.removeSong(id, songId);
            expect(service.removeSong).toHaveBeenCalledWith(id, songId);
            expect(result).toEqual({ success: true });
        });
    });

    describe('remove', () => {
        it('should call playlistsService.remove with id', async () => {
            const id = '123';
            mockPlaylistsService.remove.mockResolvedValue({ deleted: true });
            const result = await controller.remove(id);
            expect(service.remove).toHaveBeenCalledWith(id);
            expect(result).toEqual({ deleted: true });
        });
    });
});
