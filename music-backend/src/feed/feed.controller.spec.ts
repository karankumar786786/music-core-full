import { Test, TestingModule } from '@nestjs/testing';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

describe('FeedController', () => {
  let controller: FeedController;
  let service: FeedService;

  const mockFeedService = {
    getUserFeed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [
        {
          provide: FeedService,
          useValue: mockFeedService,
        },
      ],
    }).compile();

    controller = module.get<FeedController>(FeedController);
    service = module.get<FeedService>(FeedService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFeed', () => {
    it('should call feedService.getUserFeed with req.user.id', async () => {
      const req = { user: { id: 1 } };
      mockFeedService.getUserFeed.mockResolvedValue([{ id: 'song-id' }]);
      const result = await controller.getFeed(req);
      expect(service.getUserFeed).toHaveBeenCalledWith(req.user.id);
      expect(result).toEqual([{ id: 'song-id' }]);
    });
  });
});
