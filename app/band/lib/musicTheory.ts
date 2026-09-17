// app/band/lib/musicTheory.ts
// Pure TypeScript Music Theory & ChordPro Transposition Engine

export const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const CHROMATIC_FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11
};

export const FLAT_KEYS = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'];

export const KEY_DISPLAY_MAP: Record<string, string> = {
  'C': 'C',
  'C#': 'C# / Db',
  'Db': 'C# / Db',
  'D': 'D',
  'D#': 'D# / Eb',
  'Eb': 'D# / Eb',
  'E': 'E',
  'F': 'F',
  'F#': 'F# / Gb',
  'Gb': 'F# / Gb',
  'G': 'G',
  'G#': 'G# / Ab',
  'Ab': 'G# / Ab',
  'A': 'A',
  'A#': 'A# / Bb',
  'Bb': 'A# / Bb',
  'B': 'B'
};

export const ENHARMONIC_KEYS = [
  { key: 'C', display: 'C' },
  { key: 'C#', display: 'C# / Db' },
  { key: 'D', display: 'D' },
  { key: 'D#', display: 'D# / Eb' },
  { key: 'E', display: 'E' },
  { key: 'F', display: 'F' },
  { key: 'F#', display: 'F# / Gb' },
  { key: 'G', display: 'G' },
  { key: 'G#', display: 'G# / Ab' },
  { key: 'A', display: 'A' },
  { key: 'A#', display: 'A# / Bb' },
  { key: 'B', display: 'B' }
];

export function getRootNote(str: string): string {
  if (!str) return 'C';
  const m = String(str).trim().match(/^([A-G][b#]?)/i);
  return m ? m[1].toUpperCase() : 'C';
}

export function transposeNote(note: string, semitones: number, preferFlats: boolean): string {
  const cleanNote = note.trim();
  const baseSemi = NOTE_TO_SEMITONE[cleanNote];
  if (baseSemi === undefined) return note;

  const targetSemi = (baseSemi + semitones + 24) % 12;
  const scale = preferFlats ? CHROMATIC_FLATS : CHROMATIC_SHARPS;
  return scale[targetSemi];
}

export function getDiatonicChordsForKey(key: string): string[] {
  const root = (key || 'C').replace(/m$/, '');
  const isMinor = (key || '').endsWith('m');
  const preferFlats = FLAT_KEYS.includes(key);
  const scale = preferFlats ? CHROMATIC_FLATS : CHROMATIC_SHARPS;
  const rootSemi = NOTE_TO_SEMITONE[root] ?? 0;

  const intervals = isMinor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const suffixes = isMinor ? ['m', 'dim', '', 'm', 'm', '', ''] : ['', 'm', 'm', '', '', 'm', 'dim'];

  const diatonic: string[] = intervals.map((int, i) => {
    const note = scale[(rootSemi + int) % 12];
    return `${note}${suffixes[i]}`;
  });

  // Add popular worship variations (e.g. Isus4, I2, V/VII, I/III)
  const I = scale[rootSemi % 12];
  const IV = scale[(rootSemi + 5) % 12];
  const V = scale[(rootSemi + 7) % 12];
  const III = scale[(rootSemi + 4) % 12];
  const VII = scale[(rootSemi + 11) % 12];

  diatonic.push(`${I}sus4`, `${I}2`, `${V}sus4`, `${I}/${III}`, `${V}/${VII}`);
  return Array.from(new Set(diatonic));
}

export function transposeChord(chord: string, semitones: number, preferFlats = false): string {
  if (!chord || semitones === 0) return chord;
  return chord.replace(/([A-G][b#]?)([^/]*)(?:\/([A-G][b#]?))?/g, (_match, root, ext, bass) => {
    const newRoot = transposeNote(root, semitones, preferFlats);
    const newBass = bass ? '/' + transposeNote(bass, semitones, preferFlats) : '';
    return newRoot + (ext || '') + newBass;
  });
}

export function calculateSemitoneDistance(fromKey: string, toKey: string): number {
  const rootFrom = getRootNote(fromKey);
  const rootTo = getRootNote(toKey);
  const fromSemi = NOTE_TO_SEMITONE[rootFrom] ?? 0;
  const toSemi = NOTE_TO_SEMITONE[rootTo] ?? 0;
  let diff = (toSemi - fromSemi) % 12;
  if (diff < 0) diff += 12;
  return diff;
}

export interface SheetLine {
  type: 'section' | 'chord_line' | 'chordpro' | 'lyrics' | 'empty';
  raw: string;
  sectionName?: string;
  items?: { text: string; isChord: boolean }[];
}

const SECTION_KEYWORDS = [
  'intro', 'verse', 'chorus', 'pre-chorus', 'prechorus', 'bridge', 'vamp',
  'tag', 'interlude', 'outro', 'ending', 'instrumental', 'refrain', 'hook',
  'coda', 'channel', 'breakdown', 'break', 'drop', 'hold', 'build', 'stop',
  'solo', 'drums', 'all in', 'band in', 'acoustic', 'keyboards', 'pad'
];

const SECTION_REGEX = new RegExp(
  `^\\s*(\\[?(${SECTION_KEYWORDS.join('|')})(\\s+[0-9A-Za-z]+)?\\s*\\]?:?)\\s*$`,
  'i'
);

const STANDALONE_CUE_REGEX = /^\s*([A-Za-z0-9\s/–-]+:)\s*$/;
const CHORD_TOKEN_REGEX = /\b([A-G][b#]?(?:m|maj|min|sus|add|dim|aug|2|4|5|6|7|9|11|13)*(?:\/[A-G][b#]?)?)\b/g;

export function parseAndTransposeSheetLines(
  text: string,
  semitones: number,
  preferFlats: boolean
): SheetLine[] {
  if (!text) return [];

  const lines = text.split('\n');
  const result: SheetLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      result.push({ type: 'empty', raw: '' });
      continue;
    }

    // Check if line is a section header (e.g., Intro, Intro:, DROP:, HOLD:, [Chorus], etc.)
    const isStandardSection = SECTION_REGEX.test(trimmed);
    const isCustomCue = STANDALONE_CUE_REGEX.test(trimmed) && trimmed.length <= 35 && !CHORD_TOKEN_REGEX.test(trimmed);
    const isBracketedTag = /^\[[^\]]+\]:?$/.test(trimmed);

    if (isStandardSection || isCustomCue || isBracketedTag) {
      const cleanTitle = trimmed.replace(/^[\[\s]+|[\]:\s]+$/g, '').trim().toUpperCase();
      result.push({
        type: 'section',
        raw: trimmed,
        sectionName: cleanTitle
      });
      continue;
    }

    // Check if line (with or without brackets) is purely chords (e.g., "D   A   Bm" or "D   A   [Bm]" or "[D] [A] [Bm]")
    const unbracketedLine = rawLine.replace(/\[([A-G][b#]?[^\]]*)\]/g, '$1');
    const unbracketedTrimmed = unbracketedLine.trim();
    const words = unbracketedTrimmed.split(/\s+/);
    const isPureChordLine = words.length > 0 && words.every(w =>
      /^[A-G][b#]?(?:m|maj|min|sus|add|dim|aug|2|4|5|6|7|9|11|13)*(?:\/[A-G][b#]?)?$/.test(w) ||
      /^[-–—()|/]+$/.test(w)
    );

    if (isPureChordLine) {
      // Split preserving spaces and replace chord tokens (whether in brackets [Bm] or plain Bm)
      const items: { text: string; isChord: boolean }[] = [];
      let lastIdx = 0;
      const CHORD_OR_BRACKETED_REGEX = /\[?([A-G][b#]?(?:m|maj|min|sus|add|dim|aug|2|4|5|6|7|9|11|13)*(?:\/[A-G][b#]?)?)\]?/g;
      let tokenMatch: RegExpExecArray | null;

      while ((tokenMatch = CHORD_OR_BRACKETED_REGEX.exec(rawLine)) !== null) {
        if (tokenMatch.index > lastIdx) {
          items.push({ text: rawLine.substring(lastIdx, tokenMatch.index), isChord: false });
        }
        const trans = transposeChord(tokenMatch[1], semitones, preferFlats);
        items.push({ text: trans, isChord: true });
        lastIdx = tokenMatch.index + tokenMatch[0].length;
      }
      if (lastIdx < rawLine.length) {
        items.push({ text: rawLine.substring(lastIdx), isChord: false });
      }

      result.push({ type: 'chord_line', raw: rawLine, items });
      continue;
    }

    // ChordPro bracket format inside lyrics: e.g. "[C]Bless the [G]Lord"
    if (/\[[A-G][b#]?.*?\]/.test(rawLine)) {
      const items: { text: string; isChord: boolean }[] = [];
      let lastIdx = 0;
      const bracketRegex = /\[([A-G][b#]?[^\]]*)\]/g;
      let match: RegExpExecArray | null;

      while ((match = bracketRegex.exec(rawLine)) !== null) {
        if (match.index > lastIdx) {
          items.push({ text: rawLine.substring(lastIdx, match.index), isChord: false });
        }
        const transChord = transposeChord(match[1], semitones, preferFlats);
        items.push({ text: transChord, isChord: true });
        lastIdx = match.index + match[0].length;
      }

      if (lastIdx < rawLine.length) {
        items.push({ text: rawLine.substring(lastIdx), isChord: false });
      }

      result.push({ type: 'chordpro', raw: rawLine, items });
      continue;
    }

    result.push({ type: 'lyrics', raw: rawLine });
  }

  return result;
}
