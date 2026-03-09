import { processPlaylistBannerImage } from "./playlistBannerImage.processor";
import { processPlaylistCoverImage } from "./playlistCoverImage.processor";
import { ImageGroupProcessorDto } from "../../../dtos/imageProcessors/imageGroupProcessor.dto";

export async function processPlaylistImages(
    dto: ImageGroupProcessorDto
): Promise<{ coverSuccess: boolean; bannerSuccess: boolean }> {
    let coverSuccess = false;
    let bannerSuccess = false;

    if (dto.coverImage) {
        coverSuccess = await processPlaylistCoverImage(dto.coverImage);
    }

    if (dto.bannerImage) {
        bannerSuccess = await processPlaylistBannerImage(dto.bannerImage);
    }

    return { coverSuccess, bannerSuccess };
}


