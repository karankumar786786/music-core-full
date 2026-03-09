import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

import { InteractionService } from '../src/interaction/interaction.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('InteractionController (e2e)', () => {
    let app: INestApplication<App>;

    const mockInteractionService = {
        addView: jest.fn().mockResolvedValue({ success: true }),
        getHistory: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
        addSearchHistory: jest.fn().mockResolvedValue({ success: true }),
        getSearchHistory: jest.fn().mockResolvedValue([]),
        addFavourite: jest.fn().mockResolvedValue({ success: true }),
        removeFavourite: jest.fn().mockResolvedValue({ success: true }),
        getFavourites: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
        getTrending: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
        getFeatured: jest.fn().mockResolvedValue({ data: [], meta: { total: 5 } }),
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
            .overrideProvider(InteractionService)
            .useValue(mockInteractionService)
            .overrideGuard(JwtAuthGuard)
            .useValue(mockJwtAuthGuard)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/interaction/views (POST)', () => {
        return request(app.getHttpServer())
            .post('/interaction/views')
            .send({ songId: 'test-song-id' })
            .expect(201)
            .expect({ success: true });
    });

    it('/interaction/history (GET)', () => {
        return request(app.getHttpServer())
            .get('/interaction/history?page=1&limit=10')
            .expect(200)
            .expect({ data: [], meta: { total: 0 } });
    });

    it('/interaction/search-history (POST)', () => {
        return request(app.getHttpServer())
            .post('/interaction/search-history')
            .send({ searchString: 'test search' })
            .expect(201)
            .expect({ success: true });
    });

    it('/interaction/search-history (GET)', () => {
        return request(app.getHttpServer())
            .get('/interaction/search-history')
            .expect(200)
            .expect([]);
    });

    it('/interaction/favourites (POST)', () => {
        return request(app.getHttpServer())
            .post('/interaction/favourites')
            .send({ songId: 'test-song-id' })
            .expect(201)
            .expect({ success: true });
    });

    it('/interaction/favourites/:songId (DELETE)', () => {
        return request(app.getHttpServer())
            .delete('/interaction/favourites/test-song-id')
            .expect(200)
            .expect({ success: true });
    });

    it('/interaction/favourites (GET)', () => {
        return request(app.getHttpServer())
            .get('/interaction/favourites?page=1&limit=10')
            .expect(200)
            .expect({ data: [], meta: { total: 0 } });
    });

    it('/interaction/trending (GET)', () => {
        return request(app.getHttpServer())
            .get('/interaction/trending?page=1&limit=10')
            .expect(200)
            .expect({ data: [], meta: { total: 0 } });
    });

    it('/interaction/featured (GET)', () => {
        return request(app.getHttpServer())
            .get('/interaction/featured')
            .expect(200)
            .expect({ data: [], meta: { total: 5 } });
    });
});
