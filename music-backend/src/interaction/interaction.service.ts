import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AddViewDto } from './dto/add-view.dto';
import { AddSearchHistoryDto } from './dto/add-search-history.dto';
import { AddFavouriteDto } from './dto/add-favourite.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';
import { SignatureUtility } from '../lib/helpers/signature/signature.utility';
import { S3UrlUtility } from '../lib/helpers/s3-url.utility';

@Injectable()
export class InteractionService {
  private prisma = getPrismaClient();

  async addView(userId: number, addViewDto: AddViewDto) {
    const { songId } = addViewDto;

    // Verify digital signature within the ID
    const isValid = SignatureUtility.verifyId(songId);
    if (!isValid) {
      throw new UnauthorizedException('Invalid song signature provided');
    }

    // Verify song exists and get its vectorId
    const song = await this.prisma.song.findUnique({
      where: { id: songId }
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Log the view in history
    return await this.prisma.userHistory.create({
      data: {
        userId,
        songId,
        songVectorId: song.vectorId,
      },
    });
  }

  async getHistory(userId: number, paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.userHistory.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          song: true,
        },
      }),
      this.prisma.userHistory.count({ where: { userId } }),
    ]);

    const dataWithUrls = data.map((item) => ({
      ...item,
      song: item.song ? {
        ...item.song,
        coverUrl: S3UrlUtility.getCoverImageUrl(item.song.storageKey, 'medium', true),
      } : null,
    }));

    return { data: dataWithUrls, meta: { page: Number(page), limit: Number(limit), total } };
  }

  async addSearchHistory(userId: number, addSearchHistoryDto: AddSearchHistoryDto) {
    return await this.prisma.userSearchHistory.create({
      data: {
        userId,
        searchString: addSearchHistoryDto.searchString,
      },
    });
  }

  async getSearchHistory(userId: number) {
    return await this.prisma.userSearchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  async addFavourite(userId: number, addFavouriteDto: AddFavouriteDto) {
    const { songId } = addFavouriteDto;

    // Verify digital signature within the ID
    const isValid = SignatureUtility.verifyId(songId);
    if (!isValid) {
      throw new UnauthorizedException('Invalid song signature provided');
    }

    // Verify song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId }
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    return await this.prisma.userFavourites.create({
      data: {
        userId,
        songId,
      },
    });
  }

  async removeFavourite(userId: number, songId: string) {
    return await this.prisma.userFavourites.delete({
      where: {
        userId_songId: {
          userId,
          songId,
        },
      },
    });
  }

  async getFavourites(userId: number, paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.userFavourites.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          song: true,
        },
      }),
      this.prisma.userFavourites.count({ where: { userId } }),
    ]);

    const dataWithUrls = data.map((item) => ({
      ...item,
      song: item.song ? {
        ...item.song,
        coverUrl: S3UrlUtility.getCoverImageUrl(item.song.storageKey, 'medium', true),
      } : null,
    }));

    return { data: dataWithUrls, meta: { page: Number(page), limit: Number(limit), total } };
  }

  async getTrending(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    // Fast global aggregation: The most heavily interacted with songs across all users
    const topInteracted = await this.prisma.userHistory.groupBy({
      by: ['songId'],
      _count: { songId: true },
      orderBy: { _count: { songId: 'desc' } },
      skip,
      take: limit,
    });

    const songIds = topInteracted.map((t) => t.songId);

    // Retrieve the total unique history entries to structure the total meta safely
    const uniqueHistorySongs = await this.prisma.userHistory.groupBy({
      by: ['songId'],
    });

    // Hydrate
    const songs = await this.prisma.song.findMany({
      where: { id: { in: songIds } },
    });

    const dataWithUrls = songIds
      .map(id => songs.find(s => s.id === id))
      .map((song) => {
        if (!song) return null;
        return {
          ...song,
          coverUrl: S3UrlUtility.getCoverImageUrl(song.storageKey, 'medium', true),
        };
      }).filter(Boolean);

    return {
      data: dataWithUrls,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: uniqueHistorySongs.length,
      },
    };
  }

  async getFeatured() {
    // Top 5 editor featured songs / absolute newest platform additions globally
    const featuredSongs = await this.prisma.song.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const dataWithUrls = featuredSongs.map((song) => ({
      ...song,
      coverUrl: S3UrlUtility.getCoverImageUrl(song.storageKey, 'large', true),
    }));

    return {
      data: dataWithUrls,
      meta: {
        page: 1,
        limit: 5,
        total: 5,
      },
    };
  }
}
