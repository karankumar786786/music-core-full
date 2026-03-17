import { Module } from '@nestjs/common';
import { UserplaylistsService } from './userplaylists.service';
import { UserplaylistsController } from './userplaylists.controller';

@Module({
  controllers: [UserplaylistsController],
  providers: [UserplaylistsService],
})
export class UserplaylistsModule {}
