import { Test, TestingModule } from '@nestjs/testing';
import { UserplaylistsController } from './userplaylists.controller';
import { UserplaylistsService } from './userplaylists.service';

describe('UserplaylistsController', () => {
  let controller: UserplaylistsController;
  let service: UserplaylistsService;

  const mockUserplaylistsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    addSong: jest.fn(),
    removeSong: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserplaylistsController],
      providers: [
        {
          provide: UserplaylistsService,
          useValue: mockUserplaylistsService,
        },
      ],
    }).compile();

    controller = module.get<UserplaylistsController>(UserplaylistsController);
    service = module.get<UserplaylistsService>(UserplaylistsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call userplaylistsService.create with req.user.id and dto', async () => {
      const req = { user: { id: 1 } };
      const dto = { title: 'My Playlist' };
      mockUserplaylistsService.create.mockResolvedValue({ id: 'playlist-id', ...dto });
      const result = await controller.create(req, dto as any);
      expect(service.create).toHaveBeenCalledWith(req.user.id, dto);
      expect(result).toEqual({ id: 'playlist-id', ...dto });
    });
  });

  describe('findAll', () => {
    it('should call userplaylistsService.findAll with req.user.id and paginationQuery', async () => {
      const req = { user: { id: 1 } };
      const paginationQuery = { page: 1, limit: 10 };
      mockUserplaylistsService.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });
      const result = await controller.findAll(req, paginationQuery);
      expect(service.findAll).toHaveBeenCalledWith(req.user.id, paginationQuery);
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });
  });

  describe('findOne', () => {
    it('should call userplaylistsService.findOne with id and paginationQuery', async () => {
      const id = '123';
      const paginationQuery = { page: 1, limit: 10 };
      mockUserplaylistsService.findOne.mockResolvedValue({ id, title: 'My Playlist' });
      const result = await controller.findOne(id, paginationQuery);
      expect(service.findOne).toHaveBeenCalledWith(id, paginationQuery);
      expect(result).toEqual({ id, title: 'My Playlist' });
    });
  });

  describe('addSong', () => {
    it('should call userplaylistsService.addSong with id and addSongToPlaylistDto', async () => {
      const id = '123';
      const addSongToPlaylistDto = { songId: 'song-id' };
      mockUserplaylistsService.addSong.mockResolvedValue({ success: true });
      const result = await controller.addSong(id, addSongToPlaylistDto);
      expect(service.addSong).toHaveBeenCalledWith(id, addSongToPlaylistDto);
      expect(result).toEqual({ success: true });
    });
  });

  describe('removeSong', () => {
    it('should call userplaylistsService.removeSong with id and songId', async () => {
      const id = '123';
      const songId = 'song-id';
      mockUserplaylistsService.removeSong.mockResolvedValue({ success: true });
      const result = await controller.removeSong(id, songId);
      expect(service.removeSong).toHaveBeenCalledWith(id, songId);
      expect(result).toEqual({ success: true });
    });
  });

  describe('update', () => {
    it('should call userplaylistsService.update with id and dto', async () => {
      const id = '123';
      const dto = { title: 'Updated Playlist' };
      mockUserplaylistsService.update.mockResolvedValue({ id, ...dto });
      const result = await controller.update(id, dto);
      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual({ id, ...dto });
    });
  });

  describe('remove', () => {
    it('should call userplaylistsService.remove with id', async () => {
      const id = '123';
      mockUserplaylistsService.remove.mockResolvedValue({ success: true });
      const result = await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(id);
      expect(result).toEqual({ success: true });
    });
  });
});
