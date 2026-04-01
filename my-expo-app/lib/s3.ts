const S3_PRODUCTION_BUCKET = process.env.EXPO_PUBLIC_S3_BUCKET || 'onemelodyproduction';
const S3_REGION = process.env.EXPO_PUBLIC_S3_REGION || 'ap-south-1';
const CDN_URL = process.env.EXPO_PUBLIC_CDN_URL;

export const S3_BASE_URL = CDN_URL || `https://${S3_PRODUCTION_BUCKET}.s3.${S3_REGION}.amazonaws.com`;

export type ImageSize = 'small' | 'medium' | 'large';

export function getCoverImageUrl(
    storageKey: string | null | undefined,
    size: ImageSize = 'medium',
    isSong: boolean = false,
): string | null {
    if (!storageKey) return null;

    // ImageKit Dynamic Transforms
    let width = 300, height = 300;
    if (size === 'small') { width = 64; height = 64; }
    if (size === 'large') { width = 640; height = 640; }

    if (storageKey.startsWith('http')) {
        const separator = storageKey.includes('?') ? '&' : '?';
        return `${storageKey}${separator}tr=w-${width},h-${height},f-auto`;
    }

    let imageKey = storageKey;
    if (isSong && storageKey.startsWith('songs/')) {
        imageKey = storageKey.replace('songs/', 'song-cover-images/');
    }

    return imageKey.startsWith('user-profile-pictures/')
        ? `${S3_BASE_URL}/${imageKey}`
        : `${S3_BASE_URL}/${imageKey}/cover/${size}.webp`;
}

export function getBannerImageUrl(
    storageKey: string | null | undefined,
    size: ImageSize = 'medium',
): string | null {
    if (!storageKey) return null;
    
    let width = 1200, height = 400;
    if (size === 'small') { width = 600; height = 200; }
    if (size === 'large') { width = 1920; height = 640; }

    if (storageKey.startsWith('http')) {
        const separator = storageKey.includes('?') ? '&' : '?';
        return `${storageKey}${separator}tr=w-${width},h-${height},f-auto`;
    }
    return `${S3_BASE_URL}/${storageKey}/banner/${size}.webp`;
}

export function getSongBaseUrl(storageKey: string | null | undefined): string | null {
    if (!storageKey) return null;
    return `${S3_BASE_URL}/${storageKey}`;
}
