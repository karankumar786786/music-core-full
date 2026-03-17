import { Injectable, Logger } from '@nestjs/common';
import { getPresignedUrlForUpload } from '../lib/helpers/storage';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);

    async getPresignedUrl(fileName: string, contentType: string) {
        this.logger.log(`Generating presigned URL for: ${fileName} (${contentType})`);
        return await getPresignedUrlForUpload(fileName, contentType);
    }
}
