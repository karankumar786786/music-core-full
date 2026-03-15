import * as fs from "node:fs";
import { Logger } from "@nestjs/common";

const logger = new Logger('cleanupProcessedImagesFolder');

/**
 * Removes the processed images folder after a successful S3 upload.
 *
 * @param processedFolderPath - Absolute path to the local processed folder to delete.
 */
export function cleanupProcessedImagesFolder(processedFolderPath: string): void {
    if (!fs.existsSync(processedFolderPath)) {
        logger.log(`🧹 Nothing to clean — folder does not exist: ${processedFolderPath}`);
        return;
    }

    fs.rmSync(processedFolderPath, { recursive: true, force: true });
    logger.log(`🧹 Cleaned up processed images folder: ${processedFolderPath}`);
}
