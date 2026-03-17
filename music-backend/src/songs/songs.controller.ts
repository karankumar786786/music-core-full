import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Logger } from '@nestjs/common';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('songs')
@Controller('songs')
export class SongsController {
  private readonly logger = new Logger(SongsController.name);

  constructor(private readonly songsService: SongsService) { }

  @Post()
  async create(@Body() createSongDto: CreateSongDto) {
    this.logger.log(`Received request to create song: ${JSON.stringify(createSongDto)}`);
    return await this.songsService.create(createSongDto);
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    this.logger.log(`Received request to list songs: ${JSON.stringify(paginationQuery)}`);
    return this.songsService.findAll(paginationQuery);
  }

  @Get('jobs')
  findAllJobs(@Query() paginationQuery: PaginationQueryDto) {
    return this.songsService.findAllJobs(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.songsService.findOne(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.songsService.remove(id);
  }
}
