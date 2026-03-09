import { processImageScales, WIDE_SCALES } from "./../base.processor";
import { ImageProcessorDto } from "../../../dtos/imageProcessors/imageProcessor.dto";

export async function processArtistBannerImage(dto: ImageProcessorDto): Promise<boolean> {
    return await processImageScales(dto, WIDE_SCALES);
}
