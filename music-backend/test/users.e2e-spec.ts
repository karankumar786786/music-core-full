import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

import { UsersService } from '../src/users/users.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('UsersController (e2e)', () => {
    let app: INestApplication<App>;

    const mockUsersService = {
        getProfile: jest.fn().mockResolvedValue({ id: 1, name: 'Test User' }),
        updateProfile: jest.fn().mockResolvedValue({ id: 1, name: 'Updated User' }),
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
            .overrideProvider(UsersService)
            .useValue(mockUsersService)
            .overrideGuard(JwtAuthGuard)
            .useValue(mockJwtAuthGuard)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/users/me (GET)', () => {
        return request(app.getHttpServer())
            .get('/users/me')
            .expect(200)
            .expect({ id: 1, name: 'Test User' });
    });

    it('/users/me (PATCH)', () => {
        return request(app.getHttpServer())
            .patch('/users/me')
            .send({ name: 'Updated User' })
            .expect(200)
            .expect({ id: 1, name: 'Updated User' });
    });
});
