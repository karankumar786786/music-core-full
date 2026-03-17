import { processSongCoverImage } from "./songCoverImage.processor";
import type { ImageGroupProcessorDto } from "../../../dtos/imageProcessors/imageGroupProcessor.dto";

export async function processSongImages(
    dto: Pick<ImageGroupProcessorDto, 'coverImage'>
): Promise<{ coverSuccess: boolean }> {
    let coverSuccess = false;

    if (dto.coverImage) {
        coverSuccess = await processSongCoverImage(dto.coverImage);
    }

    return { coverSuccess };
}


