import { z } from 'zod';
import { createZodDto } from "nestjs-zod";

const CreatePlaylistDtoSchema = z.object(
    {
        title: z.string({ message: "Title is required must be string" }).min(1, "Title is required"),
        description: z.string({ message: "Description is required and it must be string" }).min(8, "description must be more or equal to 8 character"),
        tempCoverImageKey: z.string({ message: "tempCoverImageKey is required and must be string" }).min(1, "tempCoverImageKey is required"),
        tempBannerImageKey: z.string({ message: "tempBannerImageKey is required and must be string" }).min(1, "tempBannerImageKey is required"),
    }
)
export class CreatePlaylistDto extends createZodDto(CreatePlaylistDtoSchema) { };
export { CreatePlaylistDtoSchema };