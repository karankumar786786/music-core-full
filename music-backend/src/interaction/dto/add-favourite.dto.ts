import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const AddFavouriteDtoSchema = z.object({
    songId: z.string().min(1, 'Song ID is required'),
});

export class AddFavouriteDto extends createZodDto(AddFavouriteDtoSchema) { }
