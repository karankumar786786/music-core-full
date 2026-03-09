import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

import { UserplaylistsService } from '../src/userplaylists/userplaylists.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('UserplaylistsController (e2e)', () => {
    let app: INestApplication<App>;

    const mockUserplaylistsService = {
        create: jest.fn().mockResolvedValue({ id: '123', title: 'Test' }),
        findAll: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
        findOne: jest.fn().mockResolvedValue({ id: '123', title: 'Test' }),
        addSong: jest.fn().mockResolvedValue({ success: true }),
        removeSong: jest.fn().mockResolvedValue({ success: true }),
        update: jest.fn().mockResolvedValue({ id: '123', title: 'Updated' }),
        remove: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockJwtAuthGuard = {
        canActivate: (context: ExecutionContext) => {
            const req = context.switchToHttp().getRequest();
            req.user = { id: 1 };
            return true;
        },
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(UserplaylistsService)
            .useValue(mockUserplaylistsService)
            .overrideGuard(JwtAuthGuard)
            .useValue(mockJwtAuthGuard)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/userplaylists (POST)', () => {
        return request(app.getHttpServer())
            .post('/userplaylists')
            .send({ title: 'New Playlist' })
            .expect(201)
            .expect({ id: '123', title: 'Test' });
    });

    it('/userplaylists (GET)', () => {
        return request(app.getHttpServer())
            .get('/userplaylists?page=1&limit=10')
            .expect(200)
            .expect({ data: [], meta: { total: 0 } });
    });

    it('/userplaylists/:id (GET)', () => {
        return request(app.getHttpServer())
            .get('/userplaylists/123')
            .expect(200)
            .expect({ id: '123', title: 'Test' });
    });

    it('/userplaylists/:id/songs (POST)', () => {
        return request(app.getHttpServer())
            .post('/userplaylists/123/songs')
            .send({ songId: 'test-song-id' })
            .expect(201)
            .expect({ success: true });
    });

    it('/userplaylists/:id/songs/:songId (DELETE)', () => {
        return request(app.getHttpServer())
            .delete('/userplaylists/123/songs/test-song-id')
            .expect(200)
            .expect({ success: true });
    });

    it('/userplaylists/:id (PATCH)', () => {
        return request(app.getHttpServer())
            .patch('/userplaylists/123')
            .send({ title: 'Updated' })
            .expect(200)
            .expect({ id: '123', title: 'Updated' });
    });

    it('/userplaylists/:id (DELETE)', () => {
        return request(app.getHttpServer())
            .delete('/userplaylists/123')
            .expect(200)
            .expect({ success: true });
    });
});
