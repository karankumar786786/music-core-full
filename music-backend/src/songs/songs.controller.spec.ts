import { Test, TestingModule } from '@nestjs/testing';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';

describe('SongsController', () => {
  let controller: SongsController;
  let service: SongsService;

  const mockSongsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllJobs: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SongsController],
      providers: [
        {
          provide: SongsService,
          useValue: mockSongsService,
        },
      ],
    }).compile();

    controller = module.get<SongsController>(SongsController);
    service = module.get<SongsService>(SongsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call songsService.create with createSongDto', async () => {
      const createSongDto = {
        title: "Jo Bhi Kasmein Khai Thi Humne",
        artistName: "Alka Yagnik & Udit Narayan",
        durationMs: 313000,
        releaseDate: "2002-01-01T00:00:00.000Z",
        isrc: "INB120200000",
        genre: "90s Bollywood",
        tempSongKey: "songs/Jo Bhi Kasmein Khai Thi Humne - Raaz  Bipasha Basu & Dino Morea  Alka Yagnik & Udit Narayan - 90's Gaane.mp3",
        tempSongImageKey: "songs/Screenshot 2026-03-04 at 9.56.26 PM.png",
      };
      mockSongsService.create.mockResolvedValue('song-job-id');
      const result = await controller.create(createSongDto as any);
      expect(service.create).toHaveBeenCalledWith(createSongDto);
      expect(result).toBe('song-job-id');
    });
  });

  describe('findAll', () => {
    it('should call songsService.findAll with paginationQuery', async () => {
      const paginationQuery = { page: 1, limit: 10 };
      mockSongsService.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });
      const result = await controller.findAll(paginationQuery);
      expect(service.findAll).toHaveBeenCalledWith(paginationQuery);
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });
  });

  describe('findAllJobs', () => {
    it('should call songsService.findAllJobs with paginationQuery', async () => {
      const paginationQuery = { page: 1, limit: 10 };
      mockSongsService.findAllJobs.mockResolvedValue({ data: [], meta: { total: 0 } });
      const result = await controller.findAllJobs(paginationQuery);
      expect(service.findAllJobs).toHaveBeenCalledWith(paginationQuery);
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });
  });

  describe('findOne', () => {
    it('should call songsService.findOne with id', async () => {
      const id = '123';
      mockSongsService.findOne.mockResolvedValue({ id, title: 'Test' });
      const result = await controller.findOne(id);
      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual({ id, title: 'Test' });
    });
  });

  describe('remove', () => {
    it('should call songsService.remove with id', async () => {
      const id = '123';
      mockSongsService.remove.mockResolvedValue({ deleted: true });
      const result = await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(id);
      expect(result).toEqual({ deleted: true });
    });
  });
});

