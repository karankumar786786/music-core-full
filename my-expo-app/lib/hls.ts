/**
 * Simple parser for HLS master.m3u8 files to extract available qualities.
 */

export interface HLSVariant {
    id: string;
    bandwidth: number;
    resolution?: {
        width: number;
        height: number;
    };
    uri: string;
}

export function parseMasterM3U8(content: string): HLSVariant[] {
    const lines = content.split('\n');
    const variants: HLSVariant[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            const attributes = line.substring(18);
            const variant: Partial<HLSVariant> = {
                id: `variant-${variants.length}`,
            };

            // Parse BANDWIDTH
            const bandwidthMatch = attributes.match(/BANDWIDTH=(\d+)/);
            if (bandwidthMatch) {
                variant.bandwidth = parseInt(bandwidthMatch[1], 10);
            }

            // Parse RESOLUTION
            const resolutionMatch = attributes.match(/RESOLUTION=(\d+)x(\d+)/);
            if (resolutionMatch) {
                variant.resolution = {
                    width: parseInt(resolutionMatch[1], 10),
                    height: parseInt(resolutionMatch[2], 10),
                };
            }

            // Next line should be the URI
            if (i + 1 < lines.length) {
                variant.uri = lines[i + 1].trim();
                variants.push(variant as HLSVariant);
            }
        }
    }

    return variants;
}
