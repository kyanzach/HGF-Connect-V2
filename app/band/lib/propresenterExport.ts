// app/band/lib/propresenterExport.ts
import type { SheetLine } from './musicTheory';
import type { Song } from '../types/band';

const CHORD_REGEX = /^[A-G][b#]?(?:m|min|maj|sus|add|dim|aug|[0-9]|\/[0-9])*(?:\/[A-G][b#]?(?:m|min|maj|sus|add|dim|aug|[0-9])*)?$/i;

function isChordToken(w: string): boolean {
  return CHORD_REGEX.test(w) || /^[-–—()|/]+$/.test(w);
}

function isChordLine(l: string): boolean {
  const unbracketed = l.replace(/\[[A-G][b#]?[^\]]*\]/g, '').trim();
  if (!unbracketed) return true;
  const words = unbracketed.split(/\s+/);
  return words.length > 0 && words.every(isChordToken);
}

function isPerformanceCue(l: string): boolean {
  if (/^\*.*\*?$/.test(l)) return true;
  if (/\*(?:piano|drum|guitar|bass|synth|acoustic|cymbal|swell|groove|breakdown|vamp|marching|snare|tom|layers|dynamics|build|all in|dropdown|hits|tempo|soft|loud)\b/i.test(l)) return true;
  if (/^(?:guitar|marching|breakdown|instrumental|vamp|intro|interlude|outro|coda|solo):?$/i.test(l)) return true;
  if (/^\((?:repeat|instrumental|solo|key\s+change|\d+x|all|band|drums|build|to verse)[^)]*\)$/i.test(l)) return true;
  if (/^[A-G][b#]?=\d+/i.test(l)) return true;
  return false;
}

function isPureInstrumentalHeader(l: string): boolean {
  return /^\[?(intro|interlude|instrumental|vamp|coda|ending)/i.test(l);
}

function isSectionHeader(l: string): boolean {
  return /^\[?(verse|chorus|pre-chorus|prechorus|bridge|tag|outro|refrain)/i.test(l) && !/[a-g][b#]?m/i.test(l);
}

/**
 * Normalizes section headers to standard ProPresenter 7 group names.
 * e.g. "VERSE 1" -> "Verse 1", "[CHORUS]" -> "Chorus", "b1" -> "Bridge 1"
 */
export function normalizeProPresenterHeader(rawHeader: string): string {
  let clean = rawHeader.replace(/[\[\]*:]/g, '').trim();
  clean = clean.replace(/:.*$/, '').trim();
  clean = clean.replace(/[-–—].*$/, '').trim();
  clean = clean.replace(/\*.*\*?$/, '').trim();

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

  if (lower.includes('refrain')) return 'Refrain';

  return clean
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formats a song's lyrics for direct import into ProPresenter 7 from Clipboard.
 * If song has saved proPresenterLyrics, returns it immediately.
 */
export function formatSongForProPresenter(song: Song | null, parsedLines?: SheetLine[]): string {
  if (!song) return '';

  // If already saved with AI cleanup, return immediately
  if (song.proPresenterLyrics && song.proPresenterLyrics.trim()) {
    return song.proPresenterLyrics.trim();
  }

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

  const rawText = (song.lyrics && song.lyrics.trim()) || (song.chords && song.chords.trim()) || '';
  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Collapse multi-line asterisks
  const prefilteredLines: string[] = [];
  let inAsteriskBlock = false;
  for (const line of rawLines) {
    if (!inAsteriskBlock && line.includes('*') && (line.match(/\*/g) || []).length % 2 === 1) {
      const beforeAst = line.substring(0, line.indexOf('*')).trim();
      if (beforeAst) prefilteredLines.push(beforeAst);
      inAsteriskBlock = true;
      continue;
    }
    if (inAsteriskBlock) {
      if (line.includes('*')) {
        inAsteriskBlock = false;
        const afterAst = line.substring(line.lastIndexOf('*') + 1).trim();
        if (afterAst) prefilteredLines.push(afterAst);
      }
      continue;
    }
    prefilteredLines.push(line);
  }

  for (let i = 0; i < prefilteredLines.length; i++) {
    let line = prefilteredLines[i];

    // Extract bracketed headers if mixed with notes
    const bracketedMatch = line.match(/^(\[(?:verse|chorus|pre-chorus|prechorus|bridge|tag|outro|refrain)[^\]]*\])(?:\s*\*.*\*?)?$/i);
    if (bracketedMatch) {
      line = bracketedMatch[1];
    }

    if (isPerformanceCue(line)) continue;
    if (isChordLine(line)) continue;

    if (isPureInstrumentalHeader(line)) {
      let hasLyrics = false;
      for (let j = i + 1; j < prefilteredLines.length; j++) {
        let next = prefilteredLines[j];
        const nextB = next.match(/^(\[[^\]]+\])\s*\*.*\*?$/);
        if (nextB) next = nextB[1];
        if (isSectionHeader(next) || isPureInstrumentalHeader(next)) break;
        if (!isChordLine(next) && !isPerformanceCue(next)) {
          hasLyrics = true;
          break;
        }
      }
      if (!hasLyrics) continue;
    }

    if (isSectionHeader(line)) {
      pushCurrentGroup();
      currentGroup.header = normalizeProPresenterHeader(line);
      continue;
    }

    let lyric = line
      .replace(/\[[A-G][b#]?[^\]]*\]/g, '')
      .replace(/\*.*?\*/g, '')
      .replace(/\((?:repeat|\d+x)[^)]*\)/gi, '')
      .replace(/\[\d+x\]/gi, '')
      .trim();

    if (!lyric || isChordLine(lyric)) continue;
    currentGroup.lines.push(lyric);
  }

  pushCurrentGroup();

  const slidesOutput: string[] = [];
  for (const g of sections) {
    const gSlides: string[] = [];
    for (let i = 0; i < g.lines.length; i += 2) {
      if (i + 1 < g.lines.length) {
        gSlides.push(`${g.lines[i]}\n${g.lines[i + 1]}`);
      } else {
        gSlides.push(g.lines[i]);
      }
    }
    if (gSlides.length > 0) {
      slidesOutput.push(`${g.header}\n\n${gSlides.join('\n\n')}`);
    }
  }

  return slidesOutput.join('\n\n');
}

/**
 * Cleans song lyrics with AI (lowest credit gpt-4o-mini), saves separately to song file,
 * and returns pristine ProPresenter 7 slides.
 */
export async function cleanSongWithAi(
  song: Song,
  forceRefresh: boolean = false
): Promise<{ text: string; cached: boolean }> {
  if (!forceRefresh && song.proPresenterLyrics && song.proPresenterLyrics.trim()) {
    return { text: song.proPresenterLyrics.trim(), cached: true };
  }

  try {
    const res = await fetch('/api/worship/ai-clean-lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songId: song.id,
        title: song.title,
        artist: song.artist,
        chords: song.chords,
        lyrics: song.lyrics,
        forceRefresh,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.proPresenterLyrics) {
        return { text: data.proPresenterLyrics.trim(), cached: Boolean(data.cached) };
      }
    }
  } catch (err) {
    console.warn('[cleanSongWithAi] Server AI cleaner fallback to local cleaner:', err);
  }

  // Fallback to local rule-based cleaner
  const fallbackText = formatSongForProPresenter(song);
  return { text: fallbackText, cached: false };
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
