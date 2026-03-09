import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

import { ArtistsService } from '../src/artists/artists.service';

describe('ArtistsController (e2e)', () => {
    let app: INestApplication<App>;

    const mockArtistsService = {
        create: jest.fn().mockResolvedValue('artist-job-id'),
        findAll: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
        findOne: jest.fn().mockResolvedValue({ id: '123', name: 'Test' }),
        getSongsByArtist: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
        remove: jest.fn().mockResolvedValue({ deleted: true }),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(ArtistsService)
            .useValue(mockArtistsService)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/artists (POST) - create', () => {
        return request(app.getHttpServer())
            .post('/artists')
            .send({
                artistName: 'Test Artist',
                bio: 'Test Bio',
                dob: '1990-01-01T00:00:00.000Z',
                tempCoverImageKey: 'songs/Screenshot 2026-03-04 at 9.56.26 PM.png',
                tempBannerImageKey: 'songs/Screenshot 2026-03-04 at 9.56.26 PM.png',
            })
            .expect(201)
            .expect('artist-job-id');
    });

    it('/artists (GET) - findAll', () => {
        return request(app.getHttpServer())
            .get('/artists?page=1&limit=10')
            .expect(200)
            .expect({ data: [], meta: { total: 0 } });
    });

    it('/artists/:id (GET) - findOne', () => {
        return request(app.getHttpServer())
            .get('/artists/123')
            .expect(200)
            .expect({ id: '123', name: 'Test' });
    });

    it('/artists/:id/songs (GET) - getSongs', () => {
        return request(app.getHttpServer())
            .get('/artists/123/songs?page=1&limit=10')
            .expect(200)
            .expect({ data: [], meta: { total: 0 } });
    });

    it('/artists/:id (DELETE) - remove', () => {
        return request(app.getHttpServer())
            .delete('/artists/123')
            .expect(200)
            .expect({ deleted: true });
    });
});
