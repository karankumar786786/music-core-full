import { Injectable, UnauthorizedException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { CreateUserplaylistDto, AddSongToPlaylistDto } from './dto/create-userplaylist.dto';
import { UpdateUserplaylistDto } from './dto/update-userplaylist.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPrismaClient } from '../lib/helpers/prisma/getPrismaClient';
import { SignatureUtility } from '../lib/helpers/signature/signature.utility';

@Injectable()
export class UserplaylistsService {
  private readonly logger = new Logger(UserplaylistsService.name);
  private prisma = getPrismaClient();

  async create(userId: number, createUserplaylistDto: CreateUserplaylistDto) {
    const title = createUserplaylistDto.title?.toLowerCase();
    this.logger.log(`Creating playlist: "${title}" for user ${userId}`);

    const existingPlaylist = await this.prisma.userPlaylist.findUnique({
      where: {
        title_userId: {
          title,
          userId,
        },
      },
    });

    if (existingPlaylist) {
      throw new ConflictException(`Playlist with title "${title}" already exists`);
    }

    const id = SignatureUtility.generateSignedId();

    return await this.prisma.userPlaylist.create({
      data: {
        id,
        title,
        userId: userId,
      },
    });
  }

  async findAll(userId: number, paginationQuery: PaginationQueryDto) {
    this.logger.log(`Fetching all playlists for user ${userId}`);
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.userPlaylist.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          songs: {
            include: {
              song: true,
            },
          },
        },
      }),
      this.prisma.userPlaylist.count({ where: { userId } }),
    ]);

    return { data, meta: { page: Number(page), limit: Number(limit), total } };
  }

  async findOne(id: string, paginationQuery: PaginationQueryDto) {
    this.logger.log(`Fetching playlist: ${id}`);
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [playlist, totalNestedSongs] = await Promise.all([
      this.prisma.userPlaylist.findUnique({
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
      this.prisma.userPlaylistSongs.count({ where: { playlistId: id } }),
    ]);

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${id} not found`);
    }

    return {
      ...playlist,
      songs: {
        data: playlist.songs,
        meta: { page: Number(page), limit: Number(limit), total: totalNestedSongs },
      },
    };
  }

  async addSong(playlistId: string, addSongToPlaylistDto: AddSongToPlaylistDto) {
    const { songId } = addSongToPlaylistDto;
    this.logger.log(`Adding song ${songId} to playlist ${playlistId}`);

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

    // Check if song already exists in playlist
    const existingEntry = await this.prisma.userPlaylistSongs.findUnique({
      where: {
        songId_playlistId: {
          songId,
          playlistId,
        },
      },
    });

    if (existingEntry) {
      throw new ConflictException('Song already exists in this playlist');
    }

    return await this.prisma.userPlaylistSongs.create({
      data: {
        playlistId,
        songId,
      },
    });
  }

  async removeSong(playlistId: string, songId: string) {
    this.logger.log(`Removing song ${songId} from playlist ${playlistId}`);
    return await this.prisma.userPlaylistSongs.delete({
      where: {
        songId_playlistId: {
          songId,
          playlistId,
        },
      },
    });
  }

  async update(id: string, updateUserplaylistDto: UpdateUserplaylistDto) {
    this.logger.log(`Updating playlist ${id}: "${updateUserplaylistDto.title}"`);
    return await this.prisma.userPlaylist.update({
      where: { id },
      data: {
        title: updateUserplaylistDto.title,
      },
    });
  }

  async remove(id: string) {
    this.logger.log(`Deleting playlist ${id}`);
    return await this.prisma.userPlaylist.delete({
      where: { id },
    });
  }
}
