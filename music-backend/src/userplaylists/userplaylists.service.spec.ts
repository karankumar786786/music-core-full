import { Test, TestingModule } from '@nestjs/testing';
import { UserplaylistsService } from './userplaylists.service';

describe('UserplaylistsService', () => {
  let service: UserplaylistsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserplaylistsService],
    }).compile();

    service = module.get<UserplaylistsService>(UserplaylistsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
