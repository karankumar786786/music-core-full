import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const AuthResSchema = z.object({
    access_token: z.string(),
});

export class AuthResDto extends createZodDto(AuthResSchema) { }
