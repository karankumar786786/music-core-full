import { processArtistBannerImage } from "./artistBannerImage.processor";
import { processArtistCoverImage } from "./artistCoverImage.processor";
import { ImageGroupProcessorDto } from "../../../dtos/imageProcessors/imageGroupProcessor.dto";

export async function processArtistImages(
    dto: ImageGroupProcessorDto
): Promise<{ coverSuccess: boolean; bannerSuccess: boolean }> {
    let coverSuccess = false;
    let bannerSuccess = false;

    if (dto.coverImage) {
        coverSuccess = await processArtistCoverImage(dto.coverImage);
    }

    if (dto.bannerImage) {
        bannerSuccess = await processArtistBannerImage(dto.bannerImage);
    }

    return { coverSuccess, bannerSuccess };
}


