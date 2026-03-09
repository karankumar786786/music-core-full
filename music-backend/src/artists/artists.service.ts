import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateArtistDto } from './dto/create-artist.dto';

import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';
import { SignatureUtility } from '../lib/helpers/signature/signature.utility';

import { client } from '../lib/helpers/inngest';

@Injectable()
export class ArtistsService {
  private prisma = getPrismaClient();

  async create(createArtistDto: CreateArtistDto) {
    const job = await this.prisma.artistProcessingJob.create({
      data: {
        id: SignatureUtility.generateSignedId(),
        artistName: createArtistDto.name?.toLowerCase(),
        bio: createArtistDto.bio?.toLowerCase(),
        tempCoverImageKey: createArtistDto.tempCoverImageKey,
        tempBannerImageKey: createArtistDto.tempBannerImageKey,
        dob: new Date(createArtistDto.dob),
      },
    });

    await client.send({
      name: 'artist-process-job',
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
      this.prisma.artist.findMany({
        skip,
        take: limit,
        orderBy: { artistName: 'asc' },
      }),
      this.prisma.artist.count(),
    ]);

    return { data, meta: { page: Number(page), limit: Number(limit), total } };
  }

  async findOne(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
    });
    if (!artist) throw new NotFoundException(`Artist with ID ${id} not found`);
    return artist;
  }

  async getSongsByArtist(id: string, paginationQuery: PaginationQueryDto) {
    const artist = await this.findOne(id); // Ensures artist exists and gets the name

    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.song.findMany({
        where: { artistName: artist.artistName },
        skip,
        take: limit,
        orderBy: { releaseDate: 'desc' }, // Usually makes sense to order songs by newest
      }),
      this.prisma.song.count({ where: { artistName: artist.artistName } }),
    ]);

    return { data, meta: { page: Number(page), limit: Number(limit), total } };
  }

  async remove(id: string) {
    return await this.prisma.artist.delete({
      where: { id },
    });
  }
}
