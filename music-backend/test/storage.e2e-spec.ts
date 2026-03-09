import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { StorageService } from '../src/storage/storage.service';

describe('StorageController (e2e)', () => {
    let app: INestApplication<App>;

    const mockStorageService = {
        getPresignedUrl: jest.fn().mockResolvedValue({
            uploadUrl: 'http://example.com/upload',
            key: 'temp/test.png',
        }),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(StorageService)
            .useValue(mockStorageService)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/storage/presigned-url (GET)', () => {
        return request(app.getHttpServer())
            .get('/storage/presigned-url?fileName=test.png&contentType=image/png')
            .expect(200)
            .expect({
                uploadUrl: 'http://example.com/upload',
                key: 'temp/test.png',
            });
    });

    it('/storage/presigned-url (GET) - missing params', () => {
        // Even if validation isn't strictly enforced yet, we should see what happens
        return request(app.getHttpServer())
            .get('/storage/presigned-url')
            .expect(200); // For now it might just return nulls or error depending on implementation
    });
});
