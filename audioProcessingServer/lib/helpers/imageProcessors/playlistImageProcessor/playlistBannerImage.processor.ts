import { processImageScales, WIDE_SCALES } from "../base.processor";
import type { ImageProcessorDto } from "../../../dtos/imageProcessors/imageProcessor.dto";

export async function processPlaylistBannerImage(dto: ImageProcessorDto): Promise<boolean> {
    return await processImageScales(dto, WIDE_SCALES);
}
