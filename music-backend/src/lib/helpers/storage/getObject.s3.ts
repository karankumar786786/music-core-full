import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { client } from "./client";
import { S3ObjectDto } from "../../dtos/storage/s3Object.dto";
import * as fs from "fs";
import * as path from "path";
import { pipeline } from "stream/promises";
import { Logger } from "@nestjs/common";

const logger = new Logger('getObject.s3');

export async function getObject(dto: S3ObjectDto): Promise<boolean> {
    try {
        logger.log(`📥 Downloading from S3: Bucket=${dto.bucketName}, Key=${dto.key}`);
        if (!dto.outputDir) {
            logger.error('outputDir is missing in getObject dto');
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
            logger.log(`   Saving to: ${filePath}`);
            await pipeline(response.Body as any, fs.createWriteStream(filePath));
            logger.log(`✅ Download complete: ${filePath}`);
        } else {
            logger.warn(`S3 response body is empty for ${dto.key}`);
        }

        return true;
    } catch (error) {
        logger.error(`Error downloading from S3 (${dto.key})`, error instanceof Error ? error.message : error);
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