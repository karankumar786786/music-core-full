import { processImageScales, SQUARE_SCALES } from "./../base.processor";
import { ImageProcessorDto } from "../../../dtos/imageProcessors/imageProcessor.dto";

export async function processArtistCoverImage(dto: ImageProcessorDto): Promise<boolean> {
    return await processImageScales(dto, SQUARE_SCALES);
}
