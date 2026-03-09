import { IsString, IsNotEmpty } from 'class-validator';

export class AddFavouriteDto {
    @IsString()
    @IsNotEmpty()
    songId: string;
}
