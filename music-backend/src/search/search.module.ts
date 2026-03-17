import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
    imports: [
        CacheModule.register({
            ttl: 30_000,  // 30s TTL per entry
            max: 500,     // LRU eviction after 500 entries
        }),
    ],
    controllers: [SearchController],
    providers: [SearchService],
    exports: [SearchService],
})
export class SearchModule { }
