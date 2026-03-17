import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { client } from "./client";
import 'dotenv/config';
import { Logger } from "@nestjs/common";

const logger = new Logger('profile-picture-upload.s3');

export async function getProfilePictureUploadUrl(
    userId: number,
    fileName: string,
    contentType: string,
    expiresIn: number = 3600
): Promise<{ uploadUrl: string; key: string }> {
    try {
        const timestamp = Date.now();
        const key = `user-profile-pictures/${userId}/${timestamp}-${fileName}`;
        const bucketName = process.env.AWS_PRODUCTION_BUCKET || "onemelodyproduction";

        logger.log(`Generating profile picture upload URL for userId: ${userId}, bucket: ${bucketName}, key: ${key}`);

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(client, command, { expiresIn });

        return {
            uploadUrl,
            key,
        };
    } catch (error) {
        logger.error("Error generating profile picture upload URL", error instanceof Error ? error.stack : error);
        throw error;
    }
}
