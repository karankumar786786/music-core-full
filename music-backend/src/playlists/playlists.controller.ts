import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { AddSongToPlaylistDto } from './dto/add-song.dto';

import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('playlists')
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) { }

  @Post()
  create(@Body() createPlaylistDto: CreatePlaylistDto) {
    return this.playlistsService.create(createPlaylistDto);
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.playlistsService.findAll(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query() paginationQuery: PaginationQueryDto) {
    return this.playlistsService.findOne(id, paginationQuery);
  }

  @Post(':id/songs')
  addSong(@Param('id') id: string, @Body() addSongToPlaylistDto: AddSongToPlaylistDto) {
    return this.playlistsService.addSong(id, addSongToPlaylistDto);
  }

  @Delete(':id/songs/:songId')
  removeSong(@Param('id') id: string, @Param('songId') songId: string) {
    return this.playlistsService.removeSong(id, songId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.playlistsService.remove(id);
  }
}
