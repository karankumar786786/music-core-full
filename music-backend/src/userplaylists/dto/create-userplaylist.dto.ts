import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CreateUserplaylistDtoSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
});

const AddSongToPlaylistDtoSchema = z.object({
    songId: z.string().min(1, 'Song ID is required'),
});

export class CreateUserplaylistDto extends createZodDto(CreateUserplaylistDtoSchema) { }
export class AddSongToPlaylistDto extends createZodDto(AddSongToPlaylistDtoSchema) { }
