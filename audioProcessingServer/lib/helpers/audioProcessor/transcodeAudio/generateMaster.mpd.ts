import * as path from "node:path";
import * as fs from "node:fs";
import { QUALITY_PROFILES } from "./transcodeAudio";

/**
 * Creates a master.mpd DASH manifest in the output directory that points to the multi-quality streams.
 */
export function createMasterMpd(outputDir: string, segmentTime: number = 4): void {
    const header = `<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" minBufferTime="PT1.500S" type="static" profiles="urn:mpeg:dash:profile:isoff-live:2011,urn:com:dashif:dash264">
  <Period id="0">
    <AdaptationSet id="0" contentType="audio" segmentAlignment="true">`;

    const footer = `    </AdaptationSet>
  </Period>
</MPD>`;

    const representations = QUALITY_PROFILES.map((profile, index) => {
        const { bitrate, bandwidth } = profile;
        // The segment filename uses bitrate like "128k_%03d.m4s", but DASH SegmentTemplate uses $Number$
        const segmentTemplate = `${bitrate}/${bitrate.replace('k', '')}k_$Number%03d$.m4s`;
        const initTemplate = `${bitrate}/init.mp4`;

        return `      <Representation id="${index}" bandwidth="${bandwidth}" audioSamplingRate="44100" codecs="mp4a.40.2">
        <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>
        <SegmentTemplate initialization="${initTemplate}" media="${segmentTemplate}" startNumber="0" duration="${segmentTime * 44100}" timescale="44100"/>
      </Representation>`;
    });

    const content = [header, ...representations, footer].join("\n") + "\n";
    const masterPath = path.join(outputDir, "master.mpd");

    fs.writeFileSync(masterPath, content, { encoding: "utf-8" });
    console.log("✅ Master MPD created at:", masterPath);
}
