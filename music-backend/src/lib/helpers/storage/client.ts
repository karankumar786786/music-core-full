import { S3Client } from "@aws-sdk/client-s3";
import 'dotenv/config';


export const client = new S3Client(
    {
        region: process.env.AWS_CONFIG_REGION as string,
        credentials: {
            accessKeyId: (process.env.AWS_ACCESS_KEY || process.env.AWS_CONFIG_ACCESS_KEY_ID) as string,
            secretAccessKey: (process.env.AWS_SECRET_KEY || process.env.AWS_CONFIG_SECRET_ACCESS_KEY) as string
        },
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
    }
)