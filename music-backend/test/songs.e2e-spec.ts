import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// For E2E tests avoiding DB/Redis connections, we mock the service.
import { SongsService } from '../src/songs/songs.service';

describe('SongsController (e2e)', () => {
    let app: INestApplication<App>;

    const mockSongsService = {
        create: jest.fn().mockResolvedValue('song-job-id'),
        findAll: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
        findAllJobs: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
        findOne: jest.fn().mockResolvedValue({ id: '123', title: 'Test' }),
        remove: jest.fn().mockResolvedValue({ deleted: true }),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(SongsService)
            .useValue(mockSongsService)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/songs (POST) - create', () => {
        return request(app.getHttpServer())
            .post('/songs')
            .send({
                title: "Jo Bhi Kasmein Khai Thi Humne",
                artistName: "Alka Yagnik & Udit Narayan",
                durationMs: 313000,
                releaseDate: "2002-01-01T00:00:00.000Z",
                isrc: "INB120200000",
                genre: "90s Bollywood",
                tempSongKey: "songs/Jo Bhi Kasmein Khai Thi Humne - Raaz  Bipasha Basu & Dino Morea  Alka Yagnik & Udit Narayan - 90's Gaane.mp3",
                tempSongImageKey: "songs/Screenshot 2026-03-04 at 9.56.26 PM.png"
            })
            .expect(201)
            .expect('song-job-id');
    });

    it('/songs (GET) - findAll', () => {
        return request(app.getHttpServer())
            .get('/songs?page=1&limit=10')
            .expect(200)
            .expect({ data: [], meta: { total: 0 } });
    });

    it('/songs/jobs (GET) - findAllJobs', () => {
        return request(app.getHttpServer())
            .get('/songs/jobs?page=1&limit=10')
            .expect(200)
            .expect({ data: [], meta: { total: 0 } });
    });

    it('/songs/:id (GET) - findOne', () => {
        return request(app.getHttpServer())
            .get('/songs/123')
            .expect(200)
            .expect({ id: '123', title: 'Test' });
    });

    it('/songs/:id (DELETE) - remove', () => {
        return request(app.getHttpServer())
            .delete('/songs/123')
            .expect(200)
            .expect({ deleted: true });
    });
});
