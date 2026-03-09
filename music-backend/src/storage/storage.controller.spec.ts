import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

describe('StorageController', () => {
    let controller: StorageController;
    let service: StorageService;

    const mockStorageService = {
        getPresignedUrl: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [StorageController],
            providers: [
                {
                    provide: StorageService,
                    useValue: mockStorageService,
                },
            ],
        }).compile();

        controller = module.get<StorageController>(StorageController);
        service = module.get<StorageService>(StorageService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should return a presigned URL', async () => {
        const mockResult = { uploadUrl: 'http://example.com', key: 'temp/test.png' };
        mockStorageService.getPresignedUrl.mockResolvedValue(mockResult);

        const result = await controller.getPresignedUrl('test.png', 'image/png');

        expect(result).toEqual(mockResult);
        expect(service.getPresignedUrl).toHaveBeenCalledWith('test.png', 'image/png');
    });
});
