import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { SearchService } from './search.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('search')
@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get()
    @ApiQuery({ name: 'q', required: true, description: 'Search query (min 3 chars)' })
    @ApiQuery({ name: 'language', required: false, description: 'Filter results by language (e.g. Hindi, English)' })
    search(
        @Query('q') q: string,
        @Query('language') language?: string,
        @Query() paginationQuery?: PaginationQueryDto,
    ) {
        if (!q) return { songs: [], artists: [], playlists: [] };
        return this.searchService.globalSearch(q, paginationQuery ?? ({} as PaginationQueryDto), language);
    }
}
