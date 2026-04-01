import * as fs from "node:fs";
import * as path from "node:path";
import { imageKitClient } from "./imageKit.client";

export interface ImageKitUploadResult {
    fileId: string;
    url: string;
    filePath: string;
    name: string;
}

/**
 * Uploads a local image file to ImageKit using the v7 SDK.
 * Images are served via ImageKit's CDN and can be transformed on-demand via URL params.
 *
 * @param localFilePath - Absolute path to the local image file
 * @param folder        - ImageKit folder path (e.g. "songs/cover", "artists/{jobId}")
 * @param fileName      - Desired file name in ImageKit (without extension)
 * @returns ImageKitUploadResult with fileId, url, and filePath
 *
 * Example transformations on the returned URL:
 *   - Thumbnail: url + "?tr=w-300,h-300,c-maintain_ratio"
 *   - Small:     url + "?tr=w-64,h-64"
 *   - Large:     url + "?tr=w-640,h-640"
 */
export async function uploadImageToImageKit(
    localFilePath: string,
    folder: string,
    fileName: string
): Promise<ImageKitUploadResult> {
    if (!fs.existsSync(localFilePath)) {
        throw new Error(`File not found: ${localFilePath}`);
    }

    const fileBuffer = fs.readFileSync(localFilePath);
    const ext = path.extname(localFilePath);
    const fullFileName = `${fileName}${ext}`;

    console.log(`📤 Uploading to ImageKit: folder=${folder}, file=${fullFileName}`);

    // v7 SDK: imageKitClient.files.upload() expects base64 string, absolute path, or specific Uploadable type
    const result = await imageKitClient.files.upload({
        file: fileBuffer.toString('base64'),
        fileName: fullFileName,
        folder: folder,
        useUniqueFileName: false,
    });

    console.log(`✅ ImageKit upload complete: ${result.url}`);

    return {
        fileId: result.fileId ?? "",
        url: result.url ?? "",
        filePath: result.filePath ?? "",
        name: result.name ?? "",
    };
}

/**
 * Deletes a file from ImageKit by fileId.
 */
export async function deleteImageFromImageKit(fileId: string): Promise<void> {
    try {
        await imageKitClient.files.delete(fileId);
        console.log(`🗑️ Deleted ImageKit file: ${fileId}`);
    } catch (error) {
        console.warn(`⚠️ Could not delete ImageKit file ${fileId}:`, error);
    }
}
