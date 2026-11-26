// app/band/lib/guitarChords.ts
// Complete guitar chord voicing library, movable CAGED generator, and Web Audio acoustic strum synthesizer.

export interface GuitarVoicing {
  /** 6-string fret positions [E, A, D, G, B, e]. -1 = muted (x), 0 = open (o), >=1 = fret number */
  frets: [number, number, number, number, number, number];
  /** Finger numbers [0..4] corresponding to each string (0 = open/muted, 1=index, 2=middle, 3=ring, 4=pinky) */
  fingers: [number, number, number, number, number, number];
  /** Starting fret shown at top of diagram (1 = open position with nut) */
  baseFret: number;
  /** Optional barre definitions */
  barres?: { fret: number; fromString: number; toString: number }[];
  /** Human-readable voicing label (e.g. "Open", "Worship", "Barre · 3fr") */
  label: string;
}

export interface ParsedGuitarChord {
  symbol: string;
  root: string;
  quality: string;
  bass?: string;
  displayName: string;
  voicings: GuitarVoicing[];
}

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  Cb: 'B',
  Fb: 'E',
};

// Standard guitar tuning MIDI numbers: E2, A2, D3, G3, B3, E4
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];

function toSemitone(note: string): number {
  const normalized = FLAT_TO_SHARP[note] || note;
  return CHROMATIC_NOTES.indexOf(normalized);
}

function normalizeQuality(rawSuffix: string): { key: string; name: string } {
  const s = rawSuffix.trim();
  if (!s || s === 'maj') return { key: 'major', name: 'Major' };
  if (s === 'm' || s === 'min' || s === '-') return { key: 'minor', name: 'Minor' };
  if (s === '7' || s === 'dom7') return { key: '7', name: 'Dominant 7th' };
  if (s === 'maj7' || s === 'M7' || s === 'Δ7') return { key: 'maj7', name: 'Major 7th' };
  if (s === 'm7' || s === 'min7' || s === '-7') return { key: 'm7', name: 'Minor 7th' };
  if (s === 'sus4' || s === 'sus') return { key: 'sus4', name: 'Suspended 4th' };
  if (s === 'sus2' || s === '2') return { key: 'sus2', name: 'Suspended 2nd' };
  if (s === 'add9' || s === 'add2') return { key: 'add9', name: 'Add 9' };
  if (s === '5') return { key: '5', name: 'Power Chord' };
  if (s === 'dim' || s === 'dim7' || s === '°') return { key: 'dim', name: 'Diminished' };
  if (s === 'aug' || s === '+') return { key: 'aug', name: 'Augmented' };
  if (s === '6') return { key: '6', name: 'Major 6th' };
  if (s === 'm6' || s === 'min6') return { key: 'm6', name: 'Minor 6th' };
  if (s === '9') return { key: '7', name: 'Dominant 9th' };
  if (s === 'm9' || s === 'min9') return { key: 'm7', name: 'Minor 9th' };
  if (s === 'maj9') return { key: 'maj7', name: 'Major 9th' };
  if (s.startsWith('m') && !s.startsWith('maj')) return { key: 'minor', name: `Minor (${s})` };
  return { key: 'major', name: s };
}

// Curated open & worship-standard voicings keyed by `${sharpRoot}:${qualityKey}`
const CURATED_VOICINGS: Record<string, GuitarVoicing[]> = {
  // ---- MAJOR ----
  'C:major': [
    { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1, label: 'Open' },
    { frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4], baseFret: 1, label: 'Worship' },
  ],
  'D:major': [
    { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], baseFret: 1, label: 'Open' },
    { frets: [2, 0, 0, 2, 3, 2], fingers: [1, 0, 0, 2, 4, 3], baseFret: 1, label: 'Full D/F#' },
  ],
  'E:major': [
    { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], baseFret: 1, label: 'Open' },
  ],
  'F:major': [
    {
      frets: [1, 3, 3, 2, 1, 1],
      fingers: [1, 3, 4, 2, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 0, toString: 5 }],
      label: 'Full Barre',
    },
    { frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], baseFret: 1, barres: [{ fret: 1, fromString: 4, toString: 5 }], label: 'Easy Open' },
    { frets: [-1, 3, 3, 2, 1, 0], fingers: [0, 3, 4, 2, 1, 0], baseFret: 1, label: 'Worship Fmaj7' },
  ],
  'G:major': [
    { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], baseFret: 1, label: 'Open' },
    { frets: [3, 2, 0, 0, 3, 3], fingers: [2, 1, 0, 0, 3, 4], baseFret: 1, label: 'Worship' },
  ],
  'A:major': [
    { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], baseFret: 1, label: 'Open' },
    { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0], baseFret: 1, label: 'Worship Asus2' },
  ],
  'B:major': [
    {
      frets: [-1, 2, 4, 4, 4, 2],
      fingers: [0, 1, 2, 3, 4, 1],
      baseFret: 1,
      barres: [{ fret: 2, fromString: 1, toString: 5 }],
      label: 'Barre · 2fr',
    },
    { frets: [-1, 2, 4, 4, 0, 0], fingers: [0, 1, 3, 4, 0, 0], baseFret: 1, label: 'Worship Open' },
  ],

  // ---- MINOR ----
  'A:minor': [
    { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], baseFret: 1, label: 'Open' },
  ],
  'D:minor': [
    { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], baseFret: 1, label: 'Open' },
  ],
  'E:minor': [
    { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], baseFret: 1, label: 'Open' },
    { frets: [0, 2, 2, 0, 3, 3], fingers: [0, 1, 2, 0, 3, 4], baseFret: 1, label: 'Worship Em7' },
  ],
  'B:minor': [
    {
      frets: [-1, 2, 4, 4, 3, 2],
      fingers: [0, 1, 3, 4, 2, 1],
      baseFret: 1,
      barres: [{ fret: 2, fromString: 1, toString: 5 }],
      label: 'Barre · 2fr',
    },
    { frets: [-1, 2, 0, 2, 3, 2], fingers: [0, 1, 0, 2, 4, 3], baseFret: 1, label: 'Easy Bm7' },
  ],
  'C#:minor': [
    {
      frets: [-1, 4, 6, 6, 5, 4],
      fingers: [0, 1, 3, 4, 2, 1],
      baseFret: 4,
      barres: [{ fret: 4, fromString: 1, toString: 5 }],
      label: 'Barre · 4fr',
    },
    { frets: [-1, 4, 6, 6, 0, 0], fingers: [0, 1, 3, 4, 0, 0], baseFret: 4, label: 'Worship Open' },
  ],
  'F#:minor': [
    {
      frets: [2, 4, 4, 2, 2, 2],
      fingers: [1, 3, 4, 1, 1, 1],
      baseFret: 1,
      barres: [{ fret: 2, fromString: 0, toString: 5 }],
      label: 'Barre · 2fr',
    },
    { frets: [2, 0, 2, 2, 0, 0], fingers: [1, 0, 2, 3, 0, 0], baseFret: 1, label: 'Worship Open' },
  ],

  // ---- 7TH / MAJ7 / M7 ----
  'C:7': [{ frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0], baseFret: 1, label: 'Open' }],
  'D:7': [{ frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], baseFret: 1, label: 'Open' }],
  'E:7': [{ frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], baseFret: 1, label: 'Open' }],
  'G:7': [{ frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], baseFret: 1, label: 'Open' }],
  'A:7': [{ frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 1, 0, 2, 0], baseFret: 1, label: 'Open' }],
  'B:7': [{ frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], baseFret: 1, label: 'Open' }],

  'C:maj7': [{ frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0], baseFret: 1, label: 'Open' }],
  'D:maj7': [{ frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3], baseFret: 1, label: 'Open' }],
  'E:maj7': [{ frets: [0, 2, 1, 1, 0, 0], fingers: [0, 3, 1, 2, 0, 0], baseFret: 1, label: 'Open' }],
  'F:maj7': [{ frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], baseFret: 1, label: 'Open' }],
  'G:maj7': [{ frets: [3, 2, 0, 0, 0, 2], fingers: [3, 2, 0, 0, 0, 1], baseFret: 1, label: 'Open' }],
  'A:maj7': [{ frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0], baseFret: 1, label: 'Open' }],

  'A:m7': [{ frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0], baseFret: 1, label: 'Open' }],
  'D:m7': [{ frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1], baseFret: 1, barres: [{ fret: 1, fromString: 4, toString: 5 }], label: 'Open' }],
  'E:m7': [
    { frets: [0, 2, 2, 0, 3, 3], fingers: [0, 1, 2, 0, 3, 4], baseFret: 1, label: 'Worship' },
    { frets: [0, 2, 0, 0, 0, 0], fingers: [0, 2, 0, 0, 0, 0], baseFret: 1, label: 'Open' },
  ],
  'B:m7': [{ frets: [-1, 2, 0, 2, 0, 2], fingers: [0, 1, 0, 2, 0, 3], baseFret: 1, label: 'Open' }],

  // ---- SUS / ADD9 ----
  'C:add9': [{ frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4], baseFret: 1, label: 'Open' }],
  'G:add9': [{ frets: [3, 0, 0, 2, 0, 3], fingers: [2, 0, 0, 1, 0, 3], baseFret: 1, label: 'Open' }],
  'D:add9': [{ frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0], baseFret: 1, label: 'Open' }],
  'A:sus2': [{ frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0], baseFret: 1, label: 'Open' }],
  'D:sus2': [{ frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0], baseFret: 1, label: 'Open' }],
  'C:sus2': [{ frets: [-1, 3, 0, 0, 1, 3], fingers: [0, 2, 0, 0, 1, 4], baseFret: 1, label: 'Open' }],
  'A:sus4': [{ frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0], baseFret: 1, label: 'Open' }],
  'D:sus4': [{ frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3], baseFret: 1, label: 'Open' }],
  'E:sus4': [{ frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0], baseFret: 1, label: 'Open' }],
  'G:sus4': [{ frets: [3, 3, 0, 0, 1, 3], fingers: [2, 3, 0, 0, 1, 4], baseFret: 1, label: 'Open' }],
  'C:sus4': [{ frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1], baseFret: 1, barres: [{ fret: 1, fromString: 4, toString: 5 }], label: 'Open' }],
};

// Curated worship slash chords keyed by `${sharpRoot}:${qualityKey}/${sharpBass}`
const SLASH_VOICINGS: Record<string, GuitarVoicing[]> = {
  'G:major/B': [{ frets: [-1, 2, 0, 0, 3, 3], fingers: [0, 1, 0, 0, 3, 4], baseFret: 1, label: 'Slash Open' }],
  'D:major/F#': [{ frets: [2, 0, 0, 2, 3, 2], fingers: [1, 0, 0, 2, 4, 3], baseFret: 1, label: 'Slash Open' }],
  'C:major/G': [{ frets: [3, 3, 2, 0, 1, 0], fingers: [3, 4, 2, 0, 1, 0], baseFret: 1, label: 'Slash Open' }],
  'C:major/E': [{ frets: [0, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1, label: 'Slash Open' }],
  'A:minor/G': [{ frets: [3, 0, 2, 2, 1, 0], fingers: [3, 0, 2, 4, 1, 0], baseFret: 1, label: 'Slash Open' }],
  'A:major/C#': [{ frets: [-1, 4, 2, 2, 2, 0], fingers: [0, 4, 1, 1, 1, 0], baseFret: 1, label: 'Slash Open' }],
  'E:major/G#': [{ frets: [4, 2, 2, 1, 0, 0], fingers: [4, 2, 3, 1, 0, 0], baseFret: 1, label: 'Slash Open' }],
  'F:major/A': [{ frets: [-1, 0, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], baseFret: 1, label: 'Slash Open' }],
  'D:minor/F': [{ frets: [1, 0, 0, 2, 3, 1], fingers: [1, 0, 0, 2, 4, 1], baseFret: 1, label: 'Slash Open' }],
};

interface MovableTemplate {
  baseRootSemitone: number; // E = 4, A = 9, D = 2
  frets: [number, number, number, number, number, number]; // -1 stays muted, >=0 shifts by fretOffset
  fingers: [number, number, number, number, number, number];
  barre?: { offset: number; fromString: number; toString: number };
  shapeName: string;
}

const MOVABLE_TEMPLATES: Record<string, MovableTemplate[]> = {
  major: [
    { baseRootSemitone: 4, frets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1], barre: { offset: 0, fromString: 0, toString: 5 }, shapeName: 'E-Shape Barre' },
    { baseRootSemitone: 9, frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 1, 2, 3, 4, 1], barre: { offset: 0, fromString: 1, toString: 5 }, shapeName: 'A-Shape Barre' },
  ],
  minor: [
    { baseRootSemitone: 9, frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1], barre: { offset: 0, fromString: 1, toString: 5 }, shapeName: 'Am-Shape Barre' },
    { baseRootSemitone: 4, frets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1], barre: { offset: 0, fromString: 0, toString: 5 }, shapeName: 'Em-Shape Barre' },
  ],
  '7': [
    { baseRootSemitone: 4, frets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1], barre: { offset: 0, fromString: 0, toString: 5 }, shapeName: 'E7 Barre' },
    { baseRootSemitone: 9, frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1], barre: { offset: 0, fromString: 1, toString: 5 }, shapeName: 'A7 Barre' },
  ],
  maj7: [
    { baseRootSemitone: 9, frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 1, 3, 2, 4, 1], barre: { offset: 0, fromString: 1, toString: 5 }, shapeName: 'Amaj7 Barre' },
    { baseRootSemitone: 4, frets: [0, -1, 1, 1, 0, -1], fingers: [1, 0, 3, 4, 2, 0], shapeName: 'Jazz Maj7' },
  ],
  m7: [
    { baseRootSemitone: 9, frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1], barre: { offset: 0, fromString: 1, toString: 5 }, shapeName: 'Am7 Barre' },
    { baseRootSemitone: 4, frets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1], barre: { offset: 0, fromString: 0, toString: 5 }, shapeName: 'Em7 Barre' },
  ],
  sus4: [
    { baseRootSemitone: 4, frets: [0, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 1, 1], barre: { offset: 0, fromString: 0, toString: 5 }, shapeName: 'Esus4 Barre' },
    { baseRootSemitone: 9, frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 1, 2, 3, 4, 1], barre: { offset: 0, fromString: 1, toString: 5 }, shapeName: 'Asus4 Barre' },
  ],
  sus2: [
    { baseRootSemitone: 9, frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 1, 3, 4, 1, 1], barre: { offset: 0, fromString: 1, toString: 5 }, shapeName: 'Asus2 Barre' },
  ],
  add9: [
    { baseRootSemitone: 9, frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 1, 3, 4, 1, 1], barre: { offset: 0, fromString: 1, toString: 5 }, shapeName: 'Movable Add9' },
  ],
  '5': [
    { baseRootSemitone: 4, frets: [0, 2, 2, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0], shapeName: '6th-String Power' },
    { baseRootSemitone: 9, frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 1, 3, 4, 0, 0], shapeName: '5th-String Power' },
  ],
  dim: [
    { baseRootSemitone: 9, frets: [-1, 0, 1, 2, 1, -1], fingers: [0, 1, 2, 4, 3, 0], shapeName: 'Movable Dim' },
  ],
  aug: [
    { baseRootSemitone: 9, frets: [-1, 0, 3, 2, 2, -1], fingers: [0, 1, 4, 2, 3, 0], shapeName: 'Movable Aug' },
  ],
  '6': [
    { baseRootSemitone: 9, frets: [-1, 0, 2, 2, 2, 2], fingers: [0, 1, 2, 2, 2, 2], barre: { offset: 2, fromString: 2, toString: 5 }, shapeName: 'Movable 6th' },
  ],
  m6: [
    { baseRootSemitone: 9, frets: [-1, 0, 2, 2, 1, 2], fingers: [0, 1, 2, 3, 1, 4], shapeName: 'Movable m6' },
  ],
};

function buildMovableVoicing(template: MovableTemplate, targetSemitone: number): GuitarVoicing | null {
  let fretOffset = (targetSemitone - template.baseRootSemitone + 12) % 12;
  if (fretOffset === 0) fretOffset = 12; // open position already handled by curated shapes; offer octave up
  if (fretOffset > 11) return null;

  const frets = template.frets.map((f) => (f < 0 ? -1 : f + fretOffset)) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const playedFrets = frets.filter((f) => f > 0);
  const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 1;
  const maxFret = playedFrets.length > 0 ? Math.max(...playedFrets) : 1;
  const baseFret = maxFret <= 4 ? 1 : minFret;

  return {
    frets,
    fingers: template.fingers,
    baseFret,
    barres: template.barre
      ? [{ fret: template.barre.offset + fretOffset, fromString: template.barre.fromString, toString: template.barre.toString }]
      : undefined,
    label: `${template.shapeName} · ${fretOffset}fr`,
  };
}

export function getGuitarChordData(rawChord: string): ParsedGuitarChord | null {
  const cleaned = rawChord.trim().replace(/^\[|\]$/g, '');
  const match = cleaned.match(/^([A-G])([#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/);
  if (!match) return null;

  const rootDisplay = `${match[1]}${match[2] || ''}`;
  const sharpRoot = FLAT_TO_SHARP[rootDisplay] || rootDisplay;
  const rootSemitone = toSemitone(sharpRoot);
  if (rootSemitone < 0) return null;

  const { key: qualityKey, name: qualityName } = normalizeQuality(match[3] || '');
  const bassDisplay = match[4] || undefined;
  const sharpBass = bassDisplay ? FLAT_TO_SHARP[bassDisplay] || bassDisplay : undefined;

  const voicings: GuitarVoicing[] = [];
  const seen = new Set<string>();
  const pushUnique = (v: GuitarVoicing | null) => {
    if (!v) return;
    const sig = v.frets.join(',');
    if (seen.has(sig)) return;
    seen.add(sig);
    voicings.push(v);
  };

  // 1. Slash chord curated match first
  if (sharpBass) {
    const slashKey = `${sharpRoot}:${qualityKey}/${sharpBass}`;
    (SLASH_VOICINGS[slashKey] || []).forEach(pushUnique);
  }

  // 2. Curated open / worship shapes
  const curatedKey = `${sharpRoot}:${qualityKey}`;
  (CURATED_VOICINGS[curatedKey] || []).forEach(pushUnique);

  // 3. Movable CAGED barre shapes
  const templates = MOVABLE_TEMPLATES[qualityKey] || MOVABLE_TEMPLATES.major;
  templates.forEach((tpl) => {
    pushUnique(buildMovableVoicing(tpl, rootSemitone));
  });

  if (voicings.length === 0) return null;

  return {
    symbol: cleaned,
    root: rootDisplay,
    quality: qualityName,
    bass: bassDisplay,
    displayName: `${rootDisplay} ${qualityName}${bassDisplay ? ` / ${bassDisplay}` : ''}`,
    voicings,
  };
}

// ============================================================================
// REAL-TIME ACOUSTIC GUITAR STRUM SYNTHESIZER (Web Audio API, 0 KB assets)
// ============================================================================
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Strums or arpeggiates a guitar voicing using warm Web Audio acoustic string synthesis.
 * @param voicing The 6-string voicing to play
 * @param mode 'strum' (32ms stagger) or 'arpeggio' (155ms stagger)
 * @param onStringPluck Optional callback invoked with string index (0..5) as each string rings
 */
export function playGuitarVoicing(
  voicing: GuitarVoicing,
  mode: 'strum' | 'arpeggio' = 'strum',
  onStringPluck?: (stringIdx: number) => void
): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  const staggerSec = mode === 'arpeggio' ? 0.155 : 0.032;
  const now = ctx.currentTime + 0.02;
  const timers: ReturnType<typeof setTimeout>[] = [];

  // Master compressor to prevent clipping when all 6 strings ring together
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-16, now);
  compressor.knee.setValueAtTime(20, now);
  compressor.ratio.setValueAtTime(6, now);
  compressor.connect(ctx.destination);

  let strumStep = 0;
  voicing.frets.forEach((fret, stringIdx) => {
    if (fret < 0) return; // muted string

    const startTime = now + strumStep * staggerSec;
    const delayMs = Math.round(strumStep * staggerSec * 1000);
    strumStep += 1;

    if (onStringPluck) {
      timers.push(setTimeout(() => onStringPluck(stringIdx), delayMs));
    }

    const freq = midiToHz(OPEN_STRING_MIDI[stringIdx] + fret);
    const sustainSec = mode === 'arpeggio' ? 1.85 : 1.7;

    // Warm acoustic guitar timbre: fundamental triangle + soft harmonic sawtooth
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 1.0015, startTime); // subtle natural chorus

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.22, startTime);

    // Acoustic pick-attack low-pass filter sweep (bright pluck -> warm wood body)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(1.4, startTime);
    filter.frequency.setValueAtTime(Math.min(3600, freq * 8), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(420, freq * 2.1), startTime + 0.35);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, startTime);
    amp.gain.linearRampToValueAtTime(0.2, startTime + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0008, startTime + sustainSec);

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(amp);
    amp.connect(compressor);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + sustainSec + 0.04);
    osc2.stop(startTime + sustainSec + 0.04);
  });

  return () => {
    timers.forEach(clearTimeout);
  };
}
