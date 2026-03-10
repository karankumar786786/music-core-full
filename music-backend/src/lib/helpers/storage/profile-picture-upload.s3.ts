import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { client } from "./client";
import 'dotenv/config';

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

        console.log(`Generating profile picture upload URL for userId: ${userId}, bucket: ${bucketName}, key: ${key}`);

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
        console.error("Error generating profile picture upload URL:", error);
        throw error;
    }
}
