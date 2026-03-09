import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

import { FeedService } from '../src/feed/feed.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('FeedController (e2e)', () => {
    let app: INestApplication<App>;

    const mockFeedService = {
        getUserFeed: jest.fn().mockResolvedValue([{ id: 'song-id' }]),
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
            .overrideProvider(FeedService)
            .useValue(mockFeedService)
            .overrideGuard(JwtAuthGuard)
            .useValue(mockJwtAuthGuard)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/feed (GET)', () => {
        return request(app.getHttpServer())
            .get('/feed')
            .expect(200)
            .expect([{ id: 'song-id' }]);
    });
});
