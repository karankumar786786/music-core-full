import * as fs from "node:fs";
import * as path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import 'dotenv/config';
import { Logger } from "@nestjs/common";

const logger = new Logger('uploadProcessedImages');

const AWS_PRODUCTION_BUCKET = process.env.AWS_PRODUCTION_BUCKET || "onemelodyproduction";

/**
 * Base folders for each entity type in the production S3 bucket.
 * Uses environment variables mapped to the storage buckets.
 */
export const IMAGE_S3_BASE_FOLDERS = {
    ARTIST: process.env.ARTISTS_BUCKET_BASE_FILE || "artists/",
    SONG: process.env.SONGS_BUCKET_BASE_FILE || "songs/",
    PLAYLIST: process.env.PLAYLIST_BUCKET_BASE_FILE || "playlists/",
};

export type ImageType = "cover" | "banner";

/**
 * Recursively collects all files inside a directory.
 */
function collectFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectFiles(fullPath));
        } else {
            results.push(fullPath);
        }
    }

    return results;
}

const getContentType = (ext: string): string => {
    switch (ext.toLowerCase()) {
        case ".webp": return "image/webp";
        case ".png": return "image/png";
        case ".jpg":
        case ".jpeg": return "image/jpeg";
        default: return "application/octet-stream";
    }
};

/**
 * Uploads all generated files (original and .webp scales) from a local directory to the S3 production bucket.
 * 
 * For example, if processing a song cover:
 * s3BaseFolder = "songs/"
 * entityId = "song-123"
 * imageType = "cover"
 * S3 target: s3://onemelodyproduction/songs/song-123/cover/original.png (and small.webp, etc.)
 *
 * @param localProcessingDir The absolute path to the directory containing the files
 * @param s3BaseFolder One of IMAGE_S3_BASE_FOLDERS representing the entity type folder
 * @param entityId The unique DB ID of the entity (artistId, songId, playlistId)
 * @param imageType The type of image ("cover" or "banner")
 * @returns The S3 key prefix where the images were uploaded (e.g. "songs/song-123/cover"), or null if nothing uploaded
 */
export async function uploadProcessedImages(
    localProcessingDir: string,
    s3BaseFolder: string,
    entityId: string,
    imageType: ImageType
): Promise<string | null> {
    if (!fs.existsSync(localProcessingDir)) {
        logger.warn(`Local directory not found: ${localProcessingDir}`);
        return null;
    }

    const files = collectFiles(localProcessingDir);
    if (files.length === 0) {
        logger.warn(`No files found in ${localProcessingDir}`);
        return null;
    }

    const s3Client = new S3Client({
        region: process.env.AWS_CONFIG_REGION || "ap-south-1",
        credentials: {
            accessKeyId: (process.env.AWS_ACCESS_KEY || process.env.AWS_CONFIG_ACCESS_KEY_ID) as string,
            secretAccessKey: (process.env.AWS_SECRET_KEY || process.env.AWS_CONFIG_SECRET_ACCESS_KEY) as string,
        },
    });

    const s3FolderKey = `${s3BaseFolder}${entityId}/${imageType}`;
    logger.log(`☁️  Uploading ${files.length} file(s) to s3://${AWS_PRODUCTION_BUCKET}/${s3FolderKey}`);

    let uploadedCount = 0;

    for (const filePath of files) {
        const fileName = path.basename(filePath);
        const s3Key = `${s3FolderKey}/${fileName}`;
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath);

        const command = new PutObjectCommand({
            Bucket: AWS_PRODUCTION_BUCKET,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: getContentType(ext),
        });

        await s3Client.send(command);
        uploadedCount++;
    }

    logger.log(`✅ Uploaded ${uploadedCount} file(s) to s3://${AWS_PRODUCTION_BUCKET}/${s3FolderKey}`);
    return s3FolderKey;
}
