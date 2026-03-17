import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const AddViewDtoSchema = z.object({
    songId: z.string().min(1, 'Song ID is required'),
});

export class AddViewDto extends createZodDto(AddViewDtoSchema) { }
