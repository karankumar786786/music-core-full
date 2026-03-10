export type ImageSize = 'small' | 'medium' | 'large';

export class S3UrlUtility {
    private static readonly BUCKET = process.env.AWS_PRODUCTION_BUCKET || 'onemelodyproduction';
    private static readonly REGION = process.env.AWS_CONFIG_REGION || 'ap-south-1';
    private static readonly BASE_URL = `https://${this.BUCKET}.s3.${this.REGION}.amazonaws.com`;

    static getCoverImageUrl(storageKey: string | null | undefined, size: ImageSize = 'medium', isSong: boolean = false): string | null {
        if (!storageKey) return null;

        let imageKey = storageKey;
        if (isSong && storageKey.startsWith('songs/')) {
            imageKey = storageKey.replace('songs/', 'song-cover-images/');
        }

        const url = imageKey.startsWith('user-profile-pictures/')
            ? `${this.BASE_URL}/${imageKey}`
            : `${this.BASE_URL}/${imageKey}/cover/${size}.webp`;

        return url;
    }

    static getBannerImageUrl(storageKey: string | null | undefined, size: ImageSize = 'medium'): string | null {
        if (!storageKey) return null;
        return `${this.BASE_URL}/${storageKey}/banner/${size}.webp`;
    }

    static getSongBaseUrl(storageKey: string | null | undefined): string | null {
        if (!storageKey) return null;
        return `${this.BASE_URL}/${storageKey}`;
    }
}
