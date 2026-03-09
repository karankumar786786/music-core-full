import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { CreateArtistDto } from './dto/create-artist.dto';

import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('artists')
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) { }

  @Post()
  create(@Body() createArtistDto: CreateArtistDto) {
    return this.artistsService.create(createArtistDto);
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.artistsService.findAll(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.artistsService.findOne(id);
  }

  @Get(':id/songs')
  getSongs(@Param('id') id: string, @Query() paginationQuery: PaginationQueryDto) {
    return this.artistsService.getSongsByArtist(id, paginationQuery);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.artistsService.remove(id);
  }
}
