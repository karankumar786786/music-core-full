import type { ImageProcessorDto } from "./imageProcessor.dto";

export interface ImageGroupProcessorDto {
    coverImage?: ImageProcessorDto;
    bannerImage?: ImageProcessorDto;
}
