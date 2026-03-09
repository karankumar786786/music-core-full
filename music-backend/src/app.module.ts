import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GlobalModule } from './global/global.module';
import { SongsModule } from './songs/songs.module';
import { ArtistsModule } from './artists/artists.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { UserplaylistsModule } from './userplaylists/userplaylists.module';
import { InteractionModule } from './interaction/interaction.module';
import { SearchModule } from './search/search.module';
import { ConfigModule } from '@nestjs/config';
import { FeedModule } from './feed/feed.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    AuthModule,
    GlobalModule,
    SongsModule,
    ArtistsModule,
    PlaylistsModule,
    UserplaylistsModule,
    InteractionModule,
    SearchModule,
    FeedModule,
    StorageModule,
  ],
})
export class AppModule { }
