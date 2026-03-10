import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { AddSongToPlaylistDto } from './dto/add-song.dto';

import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';
import { SignatureUtility } from '../lib/helpers/signature/signature.utility';

import { client } from '../lib/helpers/inngest';
import { S3UrlUtility } from '../lib/helpers/s3-url.utility';

@Injectable()
export class PlaylistsService {
  private prisma = getPrismaClient();

  async create(createPlaylistDto: CreatePlaylistDto) {
    const job = await this.prisma.playlistProcessingJob.create({
      data: {
        id: SignatureUtility.generateSignedId(),
        title: createPlaylistDto.title?.toLowerCase(),
        description: createPlaylistDto.description?.toLowerCase(),
        tempCoverImageKey: createPlaylistDto.tempCoverImageKey,
        tempBannerImageKey: createPlaylistDto.tempBannerImageKey,
      },
    });

    await client.send({
      name: 'playlist-process-job',
      data: {
        jobId: job.id,
        tempCoverImageKey: job.tempCoverImageKey,
        tempBannerImageKey: job.tempBannerImageKey,
      },
    });

    return job;
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.playlist.findMany({
        skip,
        take: limit,
        orderBy: { title: 'asc' },
      }),
      this.prisma.playlist.count(),
    ]);

    const dataWithUrls = data.map((playlist) => ({
      ...playlist,
      coverUrl: S3UrlUtility.getCoverImageUrl(playlist.storageKey, 'medium'),
    }));
    return { data: dataWithUrls, meta: { page: Number(page), limit: Number(limit), total } };
  }

  async findOne(id: string, paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [playlist, totalNestedSongs] = await Promise.all([
      this.prisma.playlist.findUnique({
        where: { id },
        include: {
          songs: {
            skip,
            take: limit,
            include: {
              song: true,
            },
          },
        },
      }),
      this.prisma.playlistSongs.count({ where: { playlistId: id } }),
    ]);

    if (!playlist) throw new NotFoundException(`Playlist with ID ${id} not found`);

    return {
      ...playlist,
      coverUrl: S3UrlUtility.getCoverImageUrl(playlist.storageKey, 'large'),
      songs: {
        data: playlist.songs.map((item) => ({
          ...item,
          song: {
            ...item.song,
            coverUrl: S3UrlUtility.getCoverImageUrl(item.song.storageKey, 'medium', true),
          },
        })),
        meta: { page: Number(page), limit: Number(limit), total: totalNestedSongs },
      },
    };
  }

  async addSong(playlistId: string, addSongToPlaylistDto: AddSongToPlaylistDto) {
    const { songId } = addSongToPlaylistDto;

    // Verify digital signature within the ID
    const isValid = SignatureUtility.verifyId(songId);
    if (!isValid) {
      throw new UnauthorizedException('Invalid song signature provided');
    }

    // Verify song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    return await this.prisma.playlistSongs.create({
      data: {
        playlistId,
        songId,
      },
    });
  }

  async removeSong(playlistId: string, songId: string) {
    return await this.prisma.playlistSongs.delete({
      where: {
        playlistId_songId: {
          playlistId,
          songId,
        },
      },
    });
  }

  async remove(id: string) {
    return await this.prisma.playlist.delete({
      where: { id },
    });
  }
}
