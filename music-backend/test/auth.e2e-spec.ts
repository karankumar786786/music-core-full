import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

import { AuthService } from '../src/auth/auth.service';

describe('AuthController (e2e)', () => {
    let app: INestApplication<App>;

    const mockAuthService = {
        register: jest.fn().mockResolvedValue({ token: 'test-token', user: { id: 1 } }),
        login: jest.fn().mockResolvedValue({ token: 'test-token', user: { id: 1 } }),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(AuthService)
            .useValue(mockAuthService)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/auth/register (POST)', () => {
        return request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: 'test@example.com', password: 'password', name: 'Test' })
            .expect(201)
            .expect({ token: 'test-token', user: { id: 1 } });
    });

    it('/auth/login (POST)', () => {
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'test@example.com', password: 'password' })
            .expect(200)
            .expect({ token: 'test-token', user: { id: 1 } });
    });

    // Note: /auth/me requires a valid JWT unless we mock the JwtAuthGuard globally.
    // We'll skip the exact integration of Guard here to prevent complex mocking, 
    // or just expect a 401 without bearer. To test correctly, we expect 401 Unauthorized for now.
    it('/auth/me (GET) - Unauthorized without token', () => {
        return request(app.getHttpServer())
            .get('/auth/me')
            .expect(401);
    });
});
