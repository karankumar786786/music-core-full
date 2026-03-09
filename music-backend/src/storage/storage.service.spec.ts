import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import * as storageHelpers from '../lib/helpers/storage';

jest.mock('../lib/helpers/storage', () => ({
    getPresignedUrlForUpload: jest.fn(),
}));

describe('StorageService', () => {
    let service: StorageService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [StorageService],
        }).compile();

        service = module.get<StorageService>(StorageService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return a presigned URL', async () => {
        const mockResult = { uploadUrl: 'http://example.com', key: 'temp/test.png' };
        (storageHelpers.getPresignedUrlForUpload as jest.Mock).mockResolvedValue(mockResult);

        const result = await service.getPresignedUrl('test.png', 'image/png');

        expect(result).toEqual(mockResult);
        expect(storageHelpers.getPresignedUrlForUpload).toHaveBeenCalledWith('test.png', 'image/png');
    });
});
