import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { UserplaylistsService } from './userplaylists.service';
import { CreateUserplaylistDto, AddSongToPlaylistDto } from './dto/create-userplaylist.dto';
import { UpdateUserplaylistDto } from './dto/update-userplaylist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('userplaylists')
@ApiBearerAuth()
@Controller('userplaylists')
@UseGuards(JwtAuthGuard)
export class UserplaylistsController {
  constructor(private readonly userplaylistsService: UserplaylistsService) { }

  @Post()
  create(@Request() req, @Body() createUserplaylistDto: CreateUserplaylistDto) {
    return this.userplaylistsService.create(req.user.id, createUserplaylistDto);
  }

  @Get()
  findAll(@Request() req, @Query() paginationQuery: PaginationQueryDto) {
    console.log("here")
    return this.userplaylistsService.findAll(req.user.id, paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query() paginationQuery: PaginationQueryDto) {
    return this.userplaylistsService.findOne(id, paginationQuery);
  }

  @Post(':id/songs')
  addSong(@Param('id') id: string, @Body() addSongToPlaylistDto: AddSongToPlaylistDto) {
    return this.userplaylistsService.addSong(id, addSongToPlaylistDto);
  }

  @Delete(':id/songs/:songId')
  removeSong(@Param('id') id: string, @Param('songId') songId: string) {
    return this.userplaylistsService.removeSong(id, songId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserplaylistDto: UpdateUserplaylistDto) {
    return this.userplaylistsService.update(id, updateUserplaylistDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userplaylistsService.remove(id);
  }
}
