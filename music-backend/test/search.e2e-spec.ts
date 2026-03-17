import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

import { SearchService } from '../src/search/search.service';

describe('SearchController (e2e)', () => {
    let app: INestApplication<App>;

    const mockSearchService = {
        globalSearch: jest.fn().mockResolvedValue({ songs: [], artists: [], playlists: [] }),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(SearchService)
            .useValue(mockSearchService)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/search (GET) - empty query', () => {
        return request(app.getHttpServer())
            .get('/search')
            .expect(200)
            .expect({ songs: [], artists: [], playlists: [] });
    });

    it('/search (GET) - with query', () => {
        return request(app.getHttpServer())
            .get('/search?q=test&page=1&limit=10')
            .expect(200)
            .expect({ songs: [], artists: [], playlists: [] });
    });
});
