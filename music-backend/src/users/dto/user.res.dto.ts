import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UserResSchema = z.object({
    id: z.number(),
    email: z.string().email(),
    name: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export class UserResDto extends createZodDto(UserResSchema) { }
