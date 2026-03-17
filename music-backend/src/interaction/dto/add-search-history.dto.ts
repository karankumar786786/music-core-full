import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const AddSearchHistoryDtoSchema = z.object({
    searchString: z.string().min(1, 'Search string is required'),
});

export class AddSearchHistoryDto extends createZodDto(AddSearchHistoryDtoSchema) { }
