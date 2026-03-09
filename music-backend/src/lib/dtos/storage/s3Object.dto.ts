export interface S3ObjectDto {
    key: string;
    file?: Express.Multer.File;
    body?: Buffer | Uint8Array | Blob | string | any;
    contentType?: string;
    outputDir?: string;
    bucketName: string;
}
