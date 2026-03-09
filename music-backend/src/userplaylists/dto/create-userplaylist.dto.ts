import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserplaylistDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;
}

export class AddSongToPlaylistDto {
    @IsString()
    @IsNotEmpty()
    songId: string;
}
