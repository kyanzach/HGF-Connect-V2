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

export interface ChordLyricPair {
  chord?: string;
  lyric: string;
}

export interface SheetLine {
  type: 'section' | 'chord_line' | 'chordpro' | 'lyrics' | 'empty';
  raw: string;
  sectionName?: string;
  items?: { text: string; isChord: boolean }[];
  pairs?: ChordLyricPair[];
  pairedLyric?: string;
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

/**
 * Pairs chords on a chord line with syllables/words on the lyric line below it.
 * This guarantees the chord and word are locked together as an atomic flex item,
 * preventing drift or misalignment regardless of font resizing, zoom, or wrapping.
 */
function pairChordsWithLyrics(
  chordLine: string,
  lyricLine: string,
  semitones: number,
  preferFlats: boolean
): { pairs: ChordLyricPair[]; items: { text: string; isChord: boolean }[]; transposedChordLine: string } {
  const CHORD_OR_BRACKETED_REGEX = /\[?([A-G][b#]?(?:m|maj|min|sus|add|dim|aug|2|4|5|6|7|9|11|13)*(?:\/[A-G][b#]?)?)\]?/g;
  const chordMatches: { chord: string; index: number; length: number }[] = [];
  const items: { text: string; isChord: boolean }[] = [];
  let transposedChordLine = '';
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = CHORD_OR_BRACKETED_REGEX.exec(chordLine)) !== null) {
    if (m.index > lastIdx) {
      const sp = chordLine.substring(lastIdx, m.index);
      items.push({ text: sp, isChord: false });
      transposedChordLine += sp;
    }
    const trans = transposeChord(m[1], semitones, preferFlats);
    const isBracketed = m[0].startsWith('[');
    items.push({ text: trans, isChord: true });
    transposedChordLine += isBracketed ? `[${trans}]` : trans;

    chordMatches.push({
      chord: trans,
      index: m.index,
      length: m[0].length,
    });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < chordLine.length) {
    const trailingSp = chordLine.substring(lastIdx);
    items.push({ text: trailingSp, isChord: false });
    transposedChordLine += trailingSp;
  }

  if (chordMatches.length === 0) {
    return {
      pairs: [{ lyric: lyricLine }],
      items,
      transposedChordLine,
    };
  }

  const pairs: ChordLyricPair[] = [];
  // 1. Text before first chord
  if (chordMatches[0].index > 0) {
    const pre = lyricLine.substring(0, chordMatches[0].index);
    if (pre) {
      pairs.push({ lyric: pre });
    }
  }

  // 2. Pair each chord with its matching segment of lyrics
  for (let c = 0; c < chordMatches.length; c++) {
    const current = chordMatches[c];
    const nextStart = c + 1 < chordMatches.length
      ? chordMatches[c + 1].index
      : Math.max(lyricLine.length, current.index + current.length);
    const slice = lyricLine.substring(current.index, nextStart);
    pairs.push({
      chord: current.chord,
      lyric: slice !== '' ? slice : ' ',
    });
  }

  return { pairs, items, transposedChordLine };
}

/**
 * Parses ChordPro inline bracket chords ([C]Amazing [G]Grace) into atomic pairs.
 */
function parseChordProPairs(
  line: string,
  semitones: number,
  preferFlats: boolean
): { pairs: ChordLyricPair[]; items: { text: string; isChord: boolean }[]; transposedLine: string } {
  const bracketRegex = /\[([A-G][b#]?[^\]]*)\]/g;
  const pairs: ChordLyricPair[] = [];
  const items: { text: string; isChord: boolean }[] = [];
  let transposedLine = '';
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = bracketRegex.exec(line)) !== null) {
    if (match.index > lastIdx) {
      const textBefore = line.substring(lastIdx, match.index);
      items.push({ text: textBefore, isChord: false });
      transposedLine += textBefore;
      if (pairs.length === 0) {
        pairs.push({ lyric: textBefore });
      } else {
        pairs[pairs.length - 1].lyric += textBefore;
      }
    }

    const transChord = transposeChord(match[1], semitones, preferFlats);
    items.push({ text: transChord, isChord: true });
    transposedLine += `[${transChord}]`;
    lastIdx = match.index + match[0].length;

    // Find following lyric slice up to next bracket
    const nextBracketIdx = line.indexOf('[', lastIdx);
    const followingLyric = nextBracketIdx !== -1 ? line.substring(lastIdx, nextBracketIdx) : line.substring(lastIdx);

    pairs.push({
      chord: transChord,
      lyric: followingLyric,
    });

    if (nextBracketIdx !== -1) {
      items.push({ text: followingLyric, isChord: false });
      transposedLine += followingLyric;
      lastIdx = nextBracketIdx;
      bracketRegex.lastIndex = nextBracketIdx;
    } else {
      if (followingLyric) {
        items.push({ text: followingLyric, isChord: false });
        transposedLine += followingLyric;
      }
      lastIdx = line.length;
      break;
    }
  }

  if (lastIdx < line.length) {
    const trailing = line.substring(lastIdx);
    items.push({ text: trailing, isChord: false });
    transposedLine += trailing;
    if (pairs.length > 0) {
      pairs[pairs.length - 1].lyric += trailing;
    } else {
      pairs.push({ lyric: trailing });
    }
  }

  return { pairs, items, transposedLine };
}

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
        sectionName: cleanTitle,
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
      // Check if next line is a lyric line to pair with
      const nextRaw = i + 1 < lines.length ? lines[i + 1] : null;
      const nextTrimmed = nextRaw ? nextRaw.trim() : '';
      const nextIsSection = nextTrimmed && (
        SECTION_REGEX.test(nextTrimmed) ||
        (STANDALONE_CUE_REGEX.test(nextTrimmed) && nextTrimmed.length <= 35 && !CHORD_TOKEN_REGEX.test(nextTrimmed)) ||
        /^\[[^\]]+\]:?$/.test(nextTrimmed)
      );
      const nextUnbracketed = nextTrimmed.replace(/\[([A-G][b#]?[^\]]*)\]/g, '$1');
      const nextWords = nextUnbracketed.split(/\s+/);
      const nextIsPureChordLine = nextWords.length > 0 && nextWords.every(w =>
        /^[A-G][b#]?(?:m|maj|min|sus|add|dim|aug|2|4|5|6|7|9|11|13)*(?:\/[A-G][b#]?)?$/.test(w) ||
        /^[-–—()|/]+$/.test(w)
      );
      const nextIsLyrics = Boolean(nextTrimmed && !nextIsSection && !nextIsPureChordLine && !/\[[A-G][b#]?.*?\]/.test(nextRaw!));

      if (nextIsLyrics && nextRaw !== null) {
        // Interlock chords on line i with lyrics on line i+1
        const { pairs, items, transposedChordLine } = pairChordsWithLyrics(rawLine, nextRaw, semitones, preferFlats);
        result.push({
          type: 'chord_line',
          raw: transposedChordLine,
          items,
          pairs,
          pairedLyric: nextRaw,
        });
        i++; // Consume the lyric line so it is not duplicated
        continue;
      }

      // Instrumental chord line (Intro, Solo, etc. without words underneath)
      const items: { text: string; isChord: boolean }[] = [];
      const pairs: ChordLyricPair[] = [];
      let lastIdx = 0;
      const CHORD_OR_BRACKETED_REGEX = /\[?([A-G][b#]?(?:m|maj|min|sus|add|dim|aug|2|4|5|6|7|9|11|13)*(?:\/[A-G][b#]?)?)\]?/g;
      let tokenMatch: RegExpExecArray | null;

      while ((tokenMatch = CHORD_OR_BRACKETED_REGEX.exec(rawLine)) !== null) {
        if (tokenMatch.index > lastIdx) {
          const sp = rawLine.substring(lastIdx, tokenMatch.index);
          items.push({ text: sp, isChord: false });
        }
        const trans = transposeChord(tokenMatch[1], semitones, preferFlats);
        items.push({ text: trans, isChord: true });
        pairs.push({ chord: trans, lyric: '   ' });
        lastIdx = tokenMatch.index + tokenMatch[0].length;
      }
      if (lastIdx < rawLine.length) {
        items.push({ text: rawLine.substring(lastIdx), isChord: false });
      }

      result.push({ type: 'chord_line', raw: rawLine, items, pairs });
      continue;
    }

    // ChordPro bracket format inside lyrics: e.g. "[C]Bless the [G]Lord"
    if (/\[[A-G][b#]?.*?\]/.test(rawLine)) {
      const { pairs, items, transposedLine } = parseChordProPairs(rawLine, semitones, preferFlats);
      result.push({ type: 'chordpro', raw: transposedLine, items, pairs });
      continue;
    }

    // Pure Lyric line
    result.push({
      type: 'lyrics',
      raw: rawLine,
      pairs: [{ lyric: rawLine }],
    });
  }

  return result;
}

export function transposeChordSheetText(
  text: string,
  semitones: number,
  preferFlats = false
): string {
  if (!text || semitones === 0) return text;
  const lines = parseAndTransposeSheetLines(text, semitones, preferFlats);
  return lines
    .map((line) => {
      if (line.type === 'section') return line.raw;
      if (line.type === 'empty') return '';
      if (line.type === 'chordpro') {
        return (line.items || []).map((it) => it.isChord ? `[${it.text}]` : it.text).join('');
      }
      if (line.type === 'chord_line') {
        const chordText = (line.items || []).map((it) => it.text).join('');
        if (line.pairedLyric !== undefined) {
          return `${chordText}\n${line.pairedLyric}`;
        }
        return chordText;
      }
      return line.raw;
    })
    .join('\n');
}

export function detectRootKeyFromChords(chords: string): string | null {
  if (!chords) return null;
  const lines = chords.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip common section headers like [Intro], [Chorus], Verse 1:
    if (/^\[?(intro|verse|chorus|bridge|outro|interlude|tag|hook|pre-chorus|channel)/i.test(trimmed)) {
      continue;
    }

    // Look for bracketed chord first: e.g. [D], [G#m]
    const bracketMatch = trimmed.match(/\[([A-G][b#]?(?:m|maj|min|sus|add|2|4|7|9|11|13)*(?:\/[A-G][b#]?)?)\]/i);
    if (bracketMatch) {
      return getRootNote(bracketMatch[1]);
    }

    // Check if line contains chords
    const words = trimmed.split(/\s+/);
    const chordTokens = words.filter((w) =>
      /^[A-G][b#]?(?:m|maj|min|sus|add|dim|aug|2|4|5|6|7|9|11|13)*(?:\/[A-G][b#]?)?$/i.test(w)
    );
    if (chordTokens.length > 0 && chordTokens.length >= words.length * 0.6) {
      return getRootNote(chordTokens[0]);
    }
  }
  return null;
}
