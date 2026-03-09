import { IsString, IsNotEmpty } from 'class-validator';

export class AddSearchHistoryDto {
    @IsString()
    @IsNotEmpty()
    searchString: string;
}
