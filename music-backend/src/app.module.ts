import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
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
    LoggerModule.forRoot({
      pinoHttp: {
        messageKey: "msg",
        formatters: {
          level(label) {
            return { level: label };
          }
        },
        transport: process.env.LOKI_HOST ? {
          target: 'pino-loki',
          options: {
            batching: true,
            interval: 5,
            host: process.env.LOKI_HOST,
            basicAuth: {
              username: process.env.LOKI_USERNAME || '',
              password: process.env.LOKI_PASSWORD || '',
            },
            labels: { application: 'music-backend' },
          },
        } : undefined,
      },
    }),
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
