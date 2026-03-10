/**
 * Helper to construct public S3 URLs for processed images.
 * Ported from music-backend-admin-web.
 */

const S3_PRODUCTION_BUCKET = 'onemelodyproduction';
const S3_REGION = 'ap-south-1';
export const S3_BASE_URL = `https://${S3_PRODUCTION_BUCKET}.s3.${S3_REGION}.amazonaws.com`;

export type ImageSize = 'small' | 'medium' | 'large';

/**
 * Get the public URL for a processed cover image.
 */
export function getCoverImageUrl(storageKey: string | null | undefined, size: ImageSize = 'medium', isSong: boolean = false): string | null {
    if (!storageKey) return null;

    let imageKey = storageKey;
    if (isSong && storageKey.startsWith('songs/')) {
        imageKey = storageKey.replace('songs/', 'song-cover-images/');
    }

    const url = imageKey.startsWith('user-profile-pictures/')
        ? `${S3_BASE_URL}/${imageKey}`
        : `${S3_BASE_URL}/${imageKey}/cover/${size}.webp`;

    console.log(`[getCoverImageUrl] key: ${storageKey}, generated url: ${url}`);
    return url;
}

/**
 * Get the public URL for a processed banner image.
 */
export function getBannerImageUrl(storageKey: string | null | undefined, size: ImageSize = 'medium'): string | null {
    if (!storageKey) return null;
    return `${S3_BASE_URL}/${storageKey}/banner/${size}.webp`;
}

/**
 * Get the base URL for a song's processed files (HLS, VTT).
 */
export function getSongBaseUrl(storageKey: string | null | undefined): string | null {
    if (!storageKey) return null;
    return `${S3_BASE_URL}/${storageKey}`;
}
