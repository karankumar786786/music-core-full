import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CreateSongDtoSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    artistName: z.string().min(1, 'Artist name is required'),
    durationMs: z.number().positive('Duration must be positive'),
    releaseDate: z.iso.datetime({ message: 'Invalid ISO date string' }),
    isrc: z.string().min(1, 'ISRC is required'),
    genre: z.string().optional(),
    tempSongKey: z.string().min(1, 'Temp song key is required'),
    tempSongImageKey: z.string().min(1, 'Temp song image key is required'),
});

export class CreateSongDto extends createZodDto(CreateSongDtoSchema) { }

export { CreateSongDtoSchema };
