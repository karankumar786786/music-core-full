import * as fs from "node:fs";

/**
 * Formats seconds into HLS-compliant WebVTT timestamp: HH:MM:SS.mmm
 * Hours field is mandatory in HLS WebVTT (unlike plain WebVTT where it's optional).
 */
function formatTime(seconds: number): string {
    const totalMs = Math.floor(seconds * 1000);
    const ms = totalMs % 1000;
    const totalSecs = Math.floor(totalMs / 1000);
    const secs = totalSecs % 60;
    const totalMins = Math.floor(totalSecs / 60);
    const mins = totalMins % 60;
    const hours = Math.floor(totalMins / 60);

    return (
        String(hours).padStart(2, "0") + ":" +
        String(mins).padStart(2, "0") + ":" +
        String(secs).padStart(2, "0") + "." +
        String(ms).padStart(3, "0")
    );
}

/**
 * Generates a VTT file from a given transcription JSON file path.
 *
 * @param jsonFilePath - Absolute or relative path to the input transcription JSON file.
 * @param vttOutputPath - Absolute or relative path where the final VTT file should be saved.
 */
export async function generateVtt(jsonFilePath: string, vttOutputPath: string): Promise<void> {
    if (!fs.existsSync(jsonFilePath)) {
        throw new Error(`Transcription JSON file not found: ${jsonFilePath}`);
    }

    const fileContent = fs.readFileSync(jsonFilePath, "utf-8");
    const transcriptData = JSON.parse(fileContent);

    const lines: string[] = [];

    // Standard HLS WebVTT header
    lines.push("WEBVTT");
    lines.push(""); // mandatory blank line after header

    const entries: any[] = transcriptData.diarized_transcript?.entries ?? [];

    for (const entry of entries) {
        const startSecs: number = entry.start_time_seconds ?? 0;
        const endSecs: number = Math.max(
            entry.end_time_seconds ?? 0,
            startSecs + 1  // minimum 1-second duration
        );

        const transcript: string = (entry.transcript ?? "").trim();
        if (!transcript) continue; // skip empty cues

        // No cue identifiers — just timestamp then text, matching HLS caption format
        lines.push(`${formatTime(startSecs)} --> ${formatTime(endSecs)}`);
        lines.push(transcript);
        lines.push(""); // blank line to terminate cue block
    }

    fs.writeFileSync(vttOutputPath, lines.join("\n"), { encoding: "utf8" });
    console.log(`✓ VTT generated: ${vttOutputPath}`);
}
