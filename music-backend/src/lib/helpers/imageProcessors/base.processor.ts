import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

export interface ImageScale {
    name: string;
    width: number;
    height: number;
}

export const SQUARE_SCALES: ImageScale[] = [
    { name: "small", width: 64, height: 64 },
    { name: "medium", width: 300, height: 300 },
    { name: "large", width: 640, height: 640 },
];

export const WIDE_SCALES: ImageScale[] = [
    { name: "small", width: 640, height: 274 },
    { name: "medium", width: 1280, height: 548 },
    { name: "large", width: 1920, height: 822 },
    { name: "xlarge", width: 2560, height: 1098 },
];

import { ImageProcessorDto } from "../../dtos/imageProcessors/imageProcessor.dto";

/**
 * Processes an image transactionally by generating multiple scaled WebP versions.
 * If successful, the original file is deleted.
 * If any scale fails, all partially generated images are deleted to ensure no corrupted files remain.
 * 
 * @param dto ImageProcessorDto containing inputFilePath and outputDirPath
 * @param scales Array of target resolutions
 * @returns boolean indicating success or failure
 */
export async function processImageScales(
    dto: ImageProcessorDto,
    scales: ImageScale[]
): Promise<boolean> {
    const generatedFiles: string[] = [];

    try {
        // Ensure input file exists
        if (!fs.existsSync(dto.inputFilePath)) {
            return false;
        }

        // Ensure output directory exists
        if (!fs.existsSync(dto.outputDirPath)) {
            fs.mkdirSync(dto.outputDirPath, { recursive: true });
        }

        // Copy original file to output directory
        const ext = path.extname(dto.inputFilePath);
        const originalFilename = `original${ext}`;
        const originalFilePath = path.join(dto.outputDirPath, originalFilename);
        fs.copyFileSync(dto.inputFilePath, originalFilePath);
        generatedFiles.push(originalFilePath);

        // Generate each scaled image
        for (const scale of scales) {
            const outputFilename = `${scale.name}.webp`;
            const outputFilePath = path.join(dto.outputDirPath, outputFilename);

            await sharp(dto.inputFilePath)
                .resize(scale.width, scale.height, {
                    fit: sharp.fit.cover,
                    position: sharp.strategy.entropy, // Uses smart cropping
                })
                .webp({ quality: 80 })
                .toFile(outputFilePath);

            generatedFiles.push(outputFilePath);
        }

        // Successfully generated all scales, so delete the original file
        if (fs.existsSync(dto.inputFilePath)) {
            fs.unlinkSync(dto.inputFilePath);
        }

        return true;
    } catch (error) {
        // Transactional Failure: delete any files that hit the disk during the partial loop
        for (const file of generatedFiles) {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        }
        return false;
    }
}
