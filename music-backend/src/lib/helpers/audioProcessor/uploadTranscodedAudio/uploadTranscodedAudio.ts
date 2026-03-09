import * as fs from "node:fs";
import * as path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import 'dotenv/config';

const AWS_PRODUCTION_BUCKET = process.env.AWS_PRODUCTION_BUCKET || "onemelodyproduction";
const SONGS_BUCKET_BASE_FILE = process.env.SONGS_BUCKET_BASE_FILE || "songs/";


/**
 * Content-type map for HLS and caption files.
 */
const CONTENT_TYPE_MAP: Record<string, string> = {
    ".m3u8": "application/vnd.apple.mpegurl",
    ".ts": "video/mp2t",
    ".vtt": "text/vtt",
    ".json": "application/json",
};

/**
 * Recursively collects all file paths inside a directory.
 */
function collectFiles(dir: string): string[] {
    const results: string[] = [];
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

/**
 * Uploads the entire processed audio folder to S3.
 *
 * The folder is expected to contain:
 *   - master.m3u8
 *   - caption.json
 *   - caption.vtt
 *   - 32k/  (playlist.m3u8 + .ts segments)
 *   - 64k/  (playlist.m3u8 + .ts segments)
 *   - 128k/ (playlist.m3u8 + .ts segments)
 *
 * Files will be uploaded under:  songs/{songId}/...
 *
 * @param processedFolderPath - Absolute path to the local processed folder.
 * @param songId - Unique identifier for the song (used as the S3 sub-folder name).
 * @returns The S3 base key prefix (e.g. "songs/{songId}").
 */
export async function uploadTranscodedAudio(
    processedFolderPath: string,
    songId: string,
): Promise<string> {
    if (!fs.existsSync(processedFolderPath)) {
        throw new Error(`Processed folder not found: ${processedFolderPath}`);
    }

    // Create client lazily so env vars are available at call time
    const s3Client = new S3Client({
        region: process.env.AWS_CONFIG_REGION || "ap-south-1",
        credentials: {
            accessKeyId: (process.env.AWS_ACCESS_KEY || process.env.AWS_CONFIG_ACCESS_KEY_ID) as string,
            secretAccessKey: (process.env.AWS_SECRET_KEY || process.env.AWS_CONFIG_SECRET_ACCESS_KEY) as string,
        },
    });

    const s3Prefix = `${SONGS_BUCKET_BASE_FILE}${songId}`;
    const files = collectFiles(processedFolderPath);

    console.log(`☁️  Uploading ${files.length} file(s) to s3://${AWS_PRODUCTION_BUCKET}/${s3Prefix}`);

    let uploaded = 0;

    for (const filePath of files) {
        const relativePath = path.relative(processedFolderPath, filePath);
        const s3Key = `${s3Prefix}/${relativePath.split(path.sep).join("/")}`;

        const ext = path.extname(filePath).toLowerCase();
        const contentType = CONTENT_TYPE_MAP[ext] || "application/octet-stream";

        const fileBuffer = fs.readFileSync(filePath);

        const command = new PutObjectCommand({
            Bucket: AWS_PRODUCTION_BUCKET,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: contentType,
        });

        await s3Client.send(command);
        uploaded++;
    }

    console.log(`✅ Uploaded ${uploaded} file(s) to s3://${AWS_PRODUCTION_BUCKET}/${s3Prefix}`);
    return s3Prefix;
}
