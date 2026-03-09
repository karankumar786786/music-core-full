import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StorageService } from './storage.service';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
    private readonly logger = new Logger(StorageController.name);

    constructor(private readonly storageService: StorageService) { }

    @Get('presigned-url')
    @ApiOperation({ summary: 'Get a presigned S3 URL for temporary file upload' })
    @ApiQuery({ name: 'fileName', description: 'Name of the file' })
    @ApiQuery({ name: 'contentType', description: 'Mime type of the file' })
    async getPresignedUrl(
        @Query('fileName') fileName: string,
        @Query('contentType') contentType: string,
    ) {
        this.logger.log(`Request for presigned URL: fileName=${fileName}, contentType=${contentType}`);
        return this.storageService.getPresignedUrl(fileName, contentType);
    }
}
