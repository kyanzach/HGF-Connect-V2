// app/band/lib/propresenterExport.ts
import type { SheetLine } from './musicTheory';
import type { Song } from '../types/band';

/**
 * Normalizes section headers to standard ProPresenter 7 group names.
 * e.g. "VERSE 1" -> "Verse 1", "[CHORUS]" -> "Chorus", "b1" -> "Bridge 1"
 */
export function normalizeProPresenterHeader(rawHeader: string): string {
  const clean = rawHeader.replace(/^[\[|\s#:]+|[\]|\s#:]+$/g, '').trim();
  const lower = clean.toLowerCase();

  // Match Verse
  const mVerse = lower.match(/^v(?:erse)?\s*(\d+)$/i);
  if (mVerse) return `Verse ${mVerse[1]}`;
  if (lower === 'verse' || lower === 'v') return 'Verse 1';

  // Match Chorus
  const mChorus = lower.match(/^c(?:horus)?\s*(\d*)$/i);
  if (mChorus) return mChorus[1] ? `Chorus ${mChorus[1]}` : 'Chorus';
  if (lower.includes('chorus') && !lower.includes('pre')) {
    const num = lower.match(/\d+/);
    return num ? `Chorus ${num[0]}` : 'Chorus';
  }

  // Match Pre-Chorus
  if (lower.includes('pre-chorus') || lower.includes('prechorus') || lower.includes('pre chorus') || /^pc\d*$/i.test(lower)) {
    const num = lower.match(/\d+/);
    return num ? `Pre-Chorus ${num[0]}` : 'Pre-Chorus';
  }

  // Match Bridge
  const mBridge = lower.match(/^b(?:ridge)?\s*(\d*)$/i);
  if (mBridge) return mBridge[1] ? `Bridge ${mBridge[1]}` : 'Bridge';
  if (lower.includes('bridge')) {
    const num = lower.match(/\d+/);
    return num ? `Bridge ${num[0]}` : 'Bridge';
  }

  // Match Interlude / Instrumental
  if (lower.includes('interlude') || lower.includes('instrumental') || lower.includes('vamp')) {
    const num = lower.match(/\d+/);
    return num ? `Interlude ${num[0]}` : 'Interlude';
  }

  // Match Intro
  if (lower.includes('intro')) {
    const num = lower.match(/\d+/);
    return num ? `Intro ${num[0]}` : 'Intro';
  }

  // Match Outro / Ending / Tag
  if (lower.includes('outro') || lower.includes('ending')) {
    const num = lower.match(/\d+/);
    return num ? `Outro ${num[0]}` : 'Outro';
  }
  if (lower.includes('tag')) {
    const num = lower.match(/\d+/);
    return num ? `Tag ${num[0]}` : 'Tag';
  }

  // Title case any other custom cues
  return clean
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formats a song's lyrics for direct import into ProPresenter 7 from Clipboard.
 *
 * Requirements met:
 * 1. Chords, chord brackets, and pure instrumental lines are stripped.
 * 2. Section labels (Verse 1, Chorus, Bridge, etc.) format cleanly as slide group headers.
 * 3. Lyrics inside each section are grouped into exactly 2 lines per slide, separated by blank lines.
 */
export function formatSongForProPresenter(song: Song | null, parsedLines?: SheetLine[]): string {
  interface SectionGroup {
    header: string;
    lines: string[];
  }

  const sections: SectionGroup[] = [];
  let currentGroup: SectionGroup = { header: 'Verse 1', lines: [] };

  const pushCurrentGroup = () => {
    if (currentGroup.lines.length > 0) {
      sections.push({
        header: currentGroup.header,
        lines: [...currentGroup.lines],
      });
      currentGroup.lines = [];
    }
  };

  // If parsedLines are available, use them because chord-lyric interlocking is already resolved
  if (parsedLines && parsedLines.length > 0) {
    for (const line of parsedLines) {
      if (line.type === 'section') {
        const raw = line.sectionName || line.raw || '';
        const normHeader = normalizeProPresenterHeader(raw);
        if (normHeader) {
          pushCurrentGroup();
          currentGroup.header = normHeader;
        }
        continue;
      }

      if (line.type === 'empty') continue;

      // Extract pure lyrics
      let lyric = '';
      if (line.pairedLyric) {
        lyric = line.pairedLyric;
      } else if (line.pairs && line.pairs.length > 0) {
        lyric = line.pairs.map((p) => p.lyric).join('');
      } else if (line.items && line.items.length > 0) {
        lyric = line.items.filter((it) => !it.isChord).map((it) => it.text).join('');
      } else if (line.raw) {
        lyric = line.raw;
      }

      // Strip bracketed chords e.g. [D], [G/B]
      lyric = lyric.replace(/\[[A-G][b#]?[^\]]*\]/g, '').trim();

      // Skip lines that were only musical chords, cues, or empty
      if (!lyric || /^[A-G][b#]?(?:m|maj|min|sus|add|dim|aug|2|4|5|6|7|9|11|13)*(?:\/[A-G][b#]?)?(?:\s+[A-G][b#]?[^\s]*)*$/i.test(lyric)) {
        continue;
      }

      // Skip performance cues like "(Repeat 2x)", "(Instrumental)", "(Key change)"
      if (/^\((?:repeat|instrumental|solo|key\s+change|2x|3x|4x|all|band|drums|build)[^)]*\)$/i.test(lyric)) {
        continue;
      }

      currentGroup.lines.push(lyric);
    }
  } else if (song?.lyrics || song?.chords) {
    // Fallback: parse raw song lyrics or chords
    const rawText = song.lyrics || song.chords || '';
    const rawLines = rawText.split('\n');
    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      // Section header detection
      if (/^(\[?[A-Za-z0-9\s/–-]+\]?:?)$/.test(trimmed) && trimmed.length <= 40 && !/[A-G][b#]?(?:m|maj|min|sus|add|dim|aug|2|4|5|6|7|9|11|13)/.test(trimmed)) {
        pushCurrentGroup();
        currentGroup.header = normalizeProPresenterHeader(trimmed);
        continue;
      }

      // Strip chords
      const unbracketed = trimmed.replace(/\[[A-G][b#]?[^\]]*\]/g, '').trim();
      const words = unbracketed.split(/\s+/);
      const isPureChords = words.length > 0 && words.every((w: string) =>
        /^[A-G][b#]?(?:m|maj|min|sus|add|dim|aug|2|4|5|6|7|9|11|13)*(?:\/[A-G][b#]?)?$/.test(w) ||
        /^[-–—()|/]+$/.test(w)
      );

      if (isPureChords || !unbracketed) continue;

      currentGroup.lines.push(unbracketed);
    }
  }

  pushCurrentGroup();

  if (sections.length === 0) return '';

  // Format into ProPresenter 2-line slide blocks separated by blank lines
  const outputSections: string[] = [];

  for (const sec of sections) {
    const slides: string[] = [];

    // Group into 2 lines per slide
    for (let i = 0; i < sec.lines.length; i += 2) {
      const pair = sec.lines.slice(i, i + 2);
      slides.push(pair.join('\n'));
    }

    if (slides.length > 0) {
      outputSections.push(`${sec.header}\n${slides.join('\n\n')}`);
    }
  }

  return outputSections.join('\n\n');
}

/**
 * Robust cross-browser clipboard copy with fallback textarea.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (_) {
    return false;
  }
}
