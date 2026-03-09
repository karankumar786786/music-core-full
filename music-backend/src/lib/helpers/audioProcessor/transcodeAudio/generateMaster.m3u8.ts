import * as path from "node:path";
import * as fs from "node:fs";
import { QUALITY_PROFILES } from "./transcodeAudio";

/**
 * Creates a master.m3u8 playlist in the output directory that points to the multi-quality streams.
 */
export function createMasterPlaylist(outputDir: string): void {
    const lines = [
        "#EXTM3U",
        "#EXT-X-VERSION:3",
        ""
    ];

    for (const profile of QUALITY_PROFILES) {
        const { bitrate, bandwidth } = profile;
        lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},CODECS="mp4a.40.2"`);
        lines.push(`${bitrate}/playlist.m3u8`);
    }

    const content = lines.join("\n") + "\n";
    const masterPath = path.join(outputDir, "master.m3u8");

    fs.writeFileSync(masterPath, content, { encoding: "utf-8" });
    console.log("✅ Master playlist created at:", masterPath);
}
