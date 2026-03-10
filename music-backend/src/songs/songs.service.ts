import { Injectable, Logger } from '@nestjs/common';
import { CreateSongDto } from './dto/create-song.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';
import { client } from '../lib/helpers/inngest';
import { SignatureUtility } from '../lib/helpers/signature/signature.utility';
import { S3UrlUtility } from '../lib/helpers/s3-url.utility';

@Injectable()
export class SongsService {
  private prisma = getPrismaClient();
  private readonly logger = new Logger(SongsService.name);

  async create(createSongDto: CreateSongDto) {
    this.logger.log(`Starting song creation process for: ${createSongDto.title}`);
    const generatedSongId = SignatureUtility.generateSignedId();

    try {
      const job = await this.prisma.songProcessingJob.create({
        data: {
          id: SignatureUtility.generateSignedId(),
          songId: generatedSongId,
          title: createSongDto.title?.toLowerCase(),
          artistName: createSongDto.artistName?.toLowerCase(),
          durationMs: createSongDto.durationMs,
          releaseDate: new Date(createSongDto.releaseDate),
          isrc: createSongDto.isrc,
          genre: createSongDto.genre?.toLowerCase(),
          tempSongKey: createSongDto.tempSongKey,
          tempSongImageKey: createSongDto.tempSongImageKey,
          currentStatus: 'pending',
        },
      });

      this.logger.log(`Created processing job: ${job.id}`);

      await client.send({
        name: 'audio-process-job',
        data: {
          jobId: job.id,
          tempSongKey: job.tempSongKey,
          tempSongImageKey: job.tempSongImageKey,
        },
      });

      this.logger.log(`Sent inngest event for job: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to create song processing job: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    this.logger.log(`Fetching songs: page=${page}, limit=${limit}`);

    const [data, total] = await Promise.all([
      this.prisma.song.findMany({
        orderBy: { title: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.song.count(),
    ]);

    this.logger.log(`Found ${data.length} songs out of ${total} total`);
    const dataWithUrls = data.map((song) => ({
      ...song,
      coverUrl: S3UrlUtility.getCoverImageUrl(song.storageKey, 'medium', true),
    }));
    return { data: dataWithUrls, meta: { page: Number(page), limit: Number(limit), total } };
  }

  async findAllJobs(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.songProcessingJob.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.songProcessingJob.count(),
    ]);

    return { data, meta: { page: Number(page), limit: Number(limit), total } };
  }

  async findOne(id: string) {
    const song = await this.prisma.song.findUnique({
      where: { id },
    });
    if (!song) return null;
    return {
      ...song,
      coverUrl: S3UrlUtility.getCoverImageUrl(song.storageKey, 'large', true),
    };
  }

  async remove(id: string) {
    return await this.prisma.song.delete({
      where: { id },
    });
  }
}
