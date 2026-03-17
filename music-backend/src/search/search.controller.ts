import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { SearchService } from './search.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('search')
@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get()
    search(@Query('q') q: string, @Query() paginationQuery: PaginationQueryDto) {
        if (!q) return { songs: [], artists: [], playlists: [] };
        return this.searchService.globalSearch(q, paginationQuery);
    }
}
