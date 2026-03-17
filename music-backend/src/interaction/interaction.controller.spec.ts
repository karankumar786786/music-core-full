import { Test, TestingModule } from '@nestjs/testing';
import { InteractionController } from './interaction.controller';
import { InteractionService } from './interaction.service';
import { AddViewDto } from './dto/add-view.dto';
import { AddSearchHistoryDto } from './dto/add-search-history.dto';
import { AddFavouriteDto } from './dto/add-favourite.dto';

describe('InteractionController', () => {
    let controller: InteractionController;
    let service: InteractionService;

    const mockService = {
        addView: jest.fn(),
        getHistory: jest.fn(),
        addSearchHistory: jest.fn(),
        getSearchHistory: jest.fn(),
        addFavourite: jest.fn(),
        removeFavourite: jest.fn(),
        getFavourites: jest.fn(),
        getTrending: jest.fn(),
        getFeatured: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [InteractionController],
            providers: [
                {
                    provide: InteractionService,
                    useValue: mockService,
                },
            ],
        }).compile();

        controller = module.get<InteractionController>(InteractionController);
        service = module.get<InteractionService>(InteractionService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Trending and Featured', () => {
        it('getTrending should call getTrending on service with pagination', async () => {
            const paginationQuery = { page: 2, limit: 5 };
            mockService.getTrending.mockResolvedValue({ data: [], meta: { page: 2, limit: 5, total: 0 } });
            const result = await controller.getTrending(paginationQuery);
            expect(mockService.getTrending).toHaveBeenCalledWith(paginationQuery);
            expect(result.meta.page).toBe(2);
        });

        it('getFeatured should call getFeatured on service', async () => {
            mockService.getFeatured.mockResolvedValue({ data: [], meta: { page: 1, limit: 5, total: 0 } });
            await controller.getFeatured();
            expect(mockService.getFeatured).toHaveBeenCalled();
        });
    });

    describe('History and Views', () => {
        it('addView should call addView with userId and dto', async () => {
            const dto: AddViewDto = { songId: 'test-id' };
            await controller.addView({ user: { id: 1 } }, dto);
            expect(mockService.addView).toHaveBeenCalledWith(1, dto);
        });

        it('getHistory should call getHistory with userId and pagination', async () => {
            const paginationQuery = { page: 1, limit: 10 };
            await controller.getHistory({ user: { id: 1 } }, paginationQuery);
            expect(mockService.getHistory).toHaveBeenCalledWith(1, paginationQuery);
        });
    });

    describe('Favourites', () => {
        it('addFavourite should call addFavourite with user and dto', async () => {
            const dto: AddFavouriteDto = { songId: 'test-id' };
            await controller.addFavourite({ user: { id: 1 } }, dto);
            expect(mockService.addFavourite).toHaveBeenCalledWith(1, dto);
        });

        it('removeFavourite should call removeFavourite with userId and params', async () => {
            await controller.removeFavourite({ user: { id: 1 } }, 'song-id');
            expect(mockService.removeFavourite).toHaveBeenCalledWith(1, 'song-id');
        });

        it('getFavourites should call getFavourites with pagination', async () => {
            const paginationQuery = { page: 1, limit: 10 };
            await controller.getFavourites({ user: { id: 1 } }, paginationQuery);
            expect(mockService.getFavourites).toHaveBeenCalledWith(1, paginationQuery);
        });
    });

    describe('Search History', () => {
        it('addSearchHistory should call addSearchHistory with user and dto', async () => {
            const dto: AddSearchHistoryDto = { searchString: 'hello' };
            await controller.addSearchHistory({ user: { id: 1 } }, dto);
            expect(mockService.addSearchHistory).toHaveBeenCalledWith(1, dto);
        });

        it('getSearchHistory should call getSearchHistory with userId', async () => {
            await controller.getSearchHistory({ user: { id: 1 } });
            expect(mockService.getSearchHistory).toHaveBeenCalledWith(1);
        });
    });
});
