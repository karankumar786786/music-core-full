import { Controller, Get, Post, Body, UseGuards, Request, Query, Param, Delete } from '@nestjs/common';
import { InteractionService } from './interaction.service';
import { AddViewDto } from './dto/add-view.dto';
import { AddSearchHistoryDto } from './dto/add-search-history.dto';
import { AddFavouriteDto } from './dto/add-favourite.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('interaction')
@ApiBearerAuth()
@Controller('interaction')
@UseGuards(JwtAuthGuard)
export class InteractionController {
  constructor(private readonly interactionService: InteractionService) { }

  @Post('views')
  addView(@Request() req, @Body() addViewDto: AddViewDto) {
    return this.interactionService.addView(req.user.id, addViewDto);
  }

  @Get('history')
  getHistory(@Request() req, @Query() paginationQuery: PaginationQueryDto) {
    return this.interactionService.getHistory(req.user.id, paginationQuery);
  }

  @Post('search-history')
  addSearchHistory(@Request() req, @Body() addSearchHistoryDto: AddSearchHistoryDto) {
    return this.interactionService.addSearchHistory(req.user.id, addSearchHistoryDto);
  }

  @Get('search-history')
  getSearchHistory(@Request() req) {
    return this.interactionService.getSearchHistory(req.user.id);
  }

  @Post('favourites')
  addFavourite(@Request() req, @Body() addFavouriteDto: AddFavouriteDto) {
    return this.interactionService.addFavourite(req.user.id, addFavouriteDto);
  }

  @Delete('favourites/:songId')
  removeFavourite(@Request() req, @Param('songId') songId: string) {
    return this.interactionService.removeFavourite(req.user.id, songId);
  }

  @Get('favourites/check/:songId')
  checkFavourite(@Request() req, @Param('songId') songId: string) {
    return this.interactionService.checkFavourite(req.user.id, songId);
  }

  @Get('favourites')
  getFavourites(@Request() req, @Query() paginationQuery: PaginationQueryDto) {
    return this.interactionService.getFavourites(req.user.id, paginationQuery);
  }

  @Get('trending')
  getTrending(@Query() paginationQuery: PaginationQueryDto) {
    return this.interactionService.getTrending(paginationQuery);
  }

  @Get('featured')
  getFeatured() {
    return this.interactionService.getFeatured();
  }
}
