import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

import { PlaylistsService } from '../src/playlists/playlists.service';

describe('PlaylistsController (e2e)', () => {
    let app: INestApplication<App>;

    const mockPlaylistsService = {
        create: jest.fn().mockResolvedValue('playlist-job-id'),
        findAll: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
        findOne: jest.fn().mockResolvedValue({ id: '123', title: 'Test' }),
        addSong: jest.fn().mockResolvedValue({ success: true }),
        removeSong: jest.fn().mockResolvedValue({ success: true }),
        remove: jest.fn().mockResolvedValue({ deleted: true }),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(PlaylistsService)
            .useValue(mockPlaylistsService)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/playlists (POST) - create', () => {
        return request(app.getHttpServer())
            .post('/playlists')
            .send({
                title: 'Test Playlist',
                description: 'Test Description',
                tempCoverImageKey: 'songs/Screenshot 2026-03-04 at 9.56.26 PM.png',
                tempBannerImageKey: 'songs/Screenshot 2026-03-04 at 9.56.26 PM.png',
            })
            .expect(201)
            .expect('playlist-job-id');
    });

    it('/playlists (GET) - findAll', () => {
        return request(app.getHttpServer())
            .get('/playlists?page=1&limit=10')
            .expect(200)
            .expect({ data: [], meta: { total: 0 } });
    });

    it('/playlists/:id (GET) - findOne', () => {
        return request(app.getHttpServer())
            .get('/playlists/123')
            .expect(200)
            .expect({ id: '123', title: 'Test' });
    });

    it('/playlists/:id/songs (POST) - addSong', () => {
        return request(app.getHttpServer())
            .post('/playlists/123/songs')
            .send({ songId: 'song-id' })
            .expect(201)
            .expect({ success: true });
    });

    it('/playlists/:id/songs/:songId (DELETE) - removeSong', () => {
        return request(app.getHttpServer())
            .delete('/playlists/123/songs/song-id')
            .expect(200)
            .expect({ success: true });
    });

    it('/playlists/:id (DELETE) - remove', () => {
        return request(app.getHttpServer())
            .delete('/playlists/123')
            .expect(200)
            .expect({ deleted: true });
    });
});
