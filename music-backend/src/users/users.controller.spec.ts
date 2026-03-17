import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
    let controller: UsersController;
    let service: UsersService;

    const mockUsersService = {
        getProfile: jest.fn(),
        updateProfile: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
            ],
        }).compile();

        controller = module.get<UsersController>(UsersController);
        service = module.get<UsersService>(UsersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getProfile', () => {
        it('should call usersService.getProfile with req.user.id', async () => {
            const req = { user: { id: 1 } };
            mockUsersService.getProfile.mockResolvedValue({ id: 1, name: 'Test' });
            const result = await controller.getProfile(req);
            expect(service.getProfile).toHaveBeenCalledWith(req.user.id);
            expect(result).toEqual({ id: 1, name: 'Test' });
        });
    });

    describe('updateProfile', () => {
        it('should call usersService.updateProfile with req.user.id and updateProfileDto', async () => {
            const req = { user: { id: 1 } };
            const updateProfileDto = { name: 'Updated Name', profilePictureKey: 'songs/Screenshot 2026-03-04 at 9.56.26 PM.png' };
            mockUsersService.updateProfile.mockResolvedValue({ id: 1, ...updateProfileDto });
            const result = await controller.updateProfile(req, updateProfileDto);
            expect(service.updateProfile).toHaveBeenCalledWith(req.user.id, updateProfileDto);
            expect(result).toEqual({ id: 1, ...updateProfileDto });
        });
    });
});
