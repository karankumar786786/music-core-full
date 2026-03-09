import { IsString, IsNotEmpty } from 'class-validator';

export class AddViewDto {
    @IsString()
    @IsNotEmpty()
    songId: string;
}
