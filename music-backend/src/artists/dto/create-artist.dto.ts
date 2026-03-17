import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CreateArtistDtoSchema = z.object({
    name: z.string({ message: "Name is required and must be string" }).min(1, "Name is required"),
    bio: z.string({ message: "Bio is required and must be string" }).min(8, "Bio must be at least 8 characters"),
    tempCoverImageKey: z.string({ message: "tempCoverImageKey is required and must be string" }).min(1, "tempCoverImageKey is required"),
    tempBannerImageKey: z.string({ message: "tempBannerImageKey is required and must be string" }).min(1, "tempBannerImageKey is required"),
    dob: z.iso.datetime({ message: "Invalid ISO String" })
});

export class CreateArtistDto extends createZodDto(CreateArtistDtoSchema) { }
export { CreateArtistDtoSchema };

