import { PutObjectCommand } from "@aws-sdk/client-s3";
import { client } from "./client";
import type { S3ObjectDto } from "../../dtos/storage/s3Object.dto";

export async function putObject(dto: S3ObjectDto): Promise<boolean> {
    try {
        if (!dto.file && !dto.body) return false;

        const body = dto.file ? dto.file.buffer : dto.body;
        const contentType = dto.file ? dto.file.mimetype : dto.contentType;

        const command = new PutObjectCommand({
            Bucket: dto.bucketName,
            Key: dto.key,
            Body: body,
            ContentType: contentType,
        });

        await client.send(command);
        return true;
    } catch (error) {
        return false;
    }
}