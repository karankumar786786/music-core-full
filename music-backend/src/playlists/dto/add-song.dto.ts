import { IsString, IsNotEmpty } from 'class-validator';

export class AddSongToPlaylistDto {
    @IsString()
    @IsNotEmpty()
    songId: string;
}
