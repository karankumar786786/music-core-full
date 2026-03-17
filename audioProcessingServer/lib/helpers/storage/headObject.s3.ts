import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { client } from "./client";
import type { S3ObjectDto } from "../../dtos/storage/s3Object.dto";

export async function headObject(dto: S3ObjectDto): Promise<boolean> {
    try {
        const command = new HeadObjectCommand({
            Bucket: dto.bucketName,
            Key: dto.key,
        });

        await client.send(command);
        return true;
    } catch (error) {
        return false;
    }
}