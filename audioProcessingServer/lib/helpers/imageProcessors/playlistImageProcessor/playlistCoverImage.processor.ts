import { processImageScales, SQUARE_SCALES } from "../base.processor";
import type { ImageProcessorDto } from "../../../dtos/imageProcessors/imageProcessor.dto";

export async function processPlaylistCoverImage(dto: ImageProcessorDto): Promise<boolean> {
    return await processImageScales(dto, SQUARE_SCALES);
}
