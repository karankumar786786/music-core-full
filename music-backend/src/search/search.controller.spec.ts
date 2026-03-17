import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
    let controller: SearchController;
    let service: SearchService;

    const mockSearchService = {
        globalSearch: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SearchController],
            providers: [
                {
                    provide: SearchService,
                    useValue: mockSearchService,
                },
            ],
        }).compile();

        controller = module.get<SearchController>(SearchController);
        service = module.get<SearchService>(SearchService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('search', () => {
        it('should return empty arrays if q is not provided', () => {
            const paginationQuery = { page: 1, limit: 10 };
            const result = controller.search('', paginationQuery);
            expect(result).toEqual({ songs: [], artists: [], playlists: [] });
            expect(service.globalSearch).not.toHaveBeenCalled();
        });

        it('should call searchService.globalSearch if q is provided', () => {
            const q = 'test';
            const paginationQuery = { page: 1, limit: 10 };
            mockSearchService.globalSearch.mockReturnValue({ songs: [], artists: [], playlists: [] });
            const result = controller.search(q, paginationQuery);
            expect(service.globalSearch).toHaveBeenCalledWith(q, paginationQuery);
            expect(result).toEqual({ songs: [], artists: [], playlists: [] });
        });
    });
});
