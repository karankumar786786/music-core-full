/**
 * Helper to construct public S3 URLs for processed images.
 *
 * After processing, images are stored in the production bucket:
 *   s3://onemelodyproduction/{storageKey}/cover/{small|medium|large}.webp
 *
 * The production bucket has public read access, so we can construct direct URLs.
 */

const S3_PRODUCTION_BUCKET = 'onemelodyproduction';
const S3_REGION = 'ap-south-1';
const S3_BASE_URL = `https://${S3_PRODUCTION_BUCKET}.s3.${S3_REGION}.amazonaws.com`;

export type ImageSize = 'small' | 'medium' | 'large';

/**
 * Get the public URL for a processed cover image.
 * @param storageKey - The storageKey from the DB (e.g. "artists/{jobId}" or "songs/{prefix}")
 * @param size - The image size variant (small=64px, medium=300px, large=640px)
 * @param isSong - If true, maps "songs/" prefix to "song-cover-images/"
 * @returns Full public S3 URL to the webp image, or null if no storageKey
 */
export function getCoverImageUrl(storageKey: string | null | undefined, size: ImageSize = 'medium', isSong: boolean = false): string | null {
    if (!storageKey) return null;

    // For songs, the storageKey is "songs/{jobId}", but the cover images are in "song-cover-images/{jobId}"
    let imageKey = storageKey;
    if (isSong && storageKey.startsWith('songs/')) {
        imageKey = storageKey.replace('songs/', 'song-cover-images/');
    }

    return `${S3_BASE_URL}/${imageKey}/cover/${size}.webp`;
}

/**
 * Get the public URL for a processed banner image.
 * @param storageKey - The storageKey from the DB
 * @param size - The image size variant (small, medium, large, xlarge)
 * @returns Full public S3 URL to the webp image, or null if no storageKey
 */
export function getBannerImageUrl(storageKey: string | null | undefined, size: ImageSize = 'medium'): string | null {
    if (!storageKey) return null;
    return `${S3_BASE_URL}/${storageKey}/banner/${size}.webp`;
}
