export interface LyricCue {
    start: number; // seconds
    end: number;
    text: string;
}

export function parseTimestamp(ts: string): number {
    const parts = ts.trim().split(':');
    if (parts.length === 3) {
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return 0;
}

export function parseVTT(vttText: string): LyricCue[] {
    if (!vttText.trim().startsWith('WEBVTT')) return [];
    const lines = vttText.split('\n');
    const cues: LyricCue[] = [];
    let tempCue: Partial<LyricCue> | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line === 'WEBVTT') continue;

        if (line.includes('-->')) {
            const [start, end] = line.split('-->').map((t) => t.trim());
            tempCue = { start: parseTimestamp(start), end: parseTimestamp(end), text: '' };
        } else if (tempCue && line) {
            tempCue.text = (tempCue.text ? tempCue.text + ' ' : '') + line;
            const nextLine = lines[i + 1]?.trim();
            if (!nextLine || nextLine.includes('-->') || i + 1 === lines.length) {
                cues.push(tempCue as LyricCue);
                tempCue = null;
            }
        }
    }
    return cues;
}
