import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { client } from "./client";
import 'dotenv/config';

export async function getPresignedUrlForUpload(
    fileName: string,
    contentType: string,
    expiresIn: number = 3600
): Promise<{ uploadUrl: string; key: string }> {
    const key = `temp/${Date.now()}-${fileName}`;
    const bucketName = process.env.AWS_TEMP_BUCKET;

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
}
