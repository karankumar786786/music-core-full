import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { client } from "./client";
import { S3ObjectDto } from "../../dtos/storage/s3Object.dto";
import * as fs from "fs";
import * as path from "path";
import { pipeline } from "stream/promises";

export async function getObject(dto: S3ObjectDto): Promise<boolean> {
    try {
        console.log(`📥 Downloading from S3: Bucket=${dto.bucketName}, Key=${dto.key}`);
        if (!dto.outputDir) {
            console.error('❌ Error: outputDir is missing in getObject dto');
            return false;
        }

        const command = new GetObjectCommand({
            Bucket: dto.bucketName,
            Key: dto.key,
        });

        const response = await client.send(command);

        if (response.Body) {
            fs.mkdirSync(dto.outputDir, { recursive: true });
            const filePath = path.join(dto.outputDir, path.basename(dto.key));
            console.log(`   Saving to: ${filePath}`);
            await pipeline(response.Body as any, fs.createWriteStream(filePath));
            console.log(`✅ Download complete: ${filePath}`);
        } else {
            console.warn(`⚠️ Warning: S3 response body is empty for ${dto.key}`);
        }

        return true;
    } catch (error) {
        console.error(`❌ Error downloading from S3 (${dto.key}):`, error.message);
        return false;
    }
}

export async function getPresignedUrl(dto: S3ObjectDto, expiresIn: number = 3600) {
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_TEMP_BUCKET,
        Key: dto.key,
    });

    return await getSignedUrl(client, command, { expiresIn });
}