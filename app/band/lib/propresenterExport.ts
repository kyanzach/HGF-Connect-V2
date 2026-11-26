// app/band/lib/propresenterExport.ts
import type { SheetLine } from './musicTheory';
import type { Song } from '../types/band';

export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '');
}

const CHORD_REGEX = /^[A-G][b#]?(?:m|min|maj|sus|add|dim|aug|[0-9]|\/[0-9])*(?:\/[A-G][b#]?(?:m|min|maj|sus|add|dim|aug|[0-9])*)?$/i;

function isChordToken(w: string): boolean {
  const cleaned = w.replace(/^[\(\[\{]+|[\)\]\},.:;]+$/g, '');
  if (!cleaned) return true;
  if (CHORD_REGEX.test(cleaned)) return true;
  if (/^(?:x\d+|\d+x|n\.?c\.?|tacet|rest)$/i.test(cleaned)) return true;
  if (/^[-–—()|/:.,•·]+$/.test(w)) return true;
  return false;
}

function isGuitarTabLine(l: string): boolean {
  return /^[eBGDAE]\s*\|[-0-9hpb/\\~xX|\s'^()]+$/.test(l) || /\|[-0-9hpb/\\~'\s]{4,}\|/.test(l);
}

function isChordLine(l: string): boolean {
  if (isGuitarTabLine(l)) return true;
  const unbracketed = l.replace(/\[[A-G][b#]?[^\]]*\]/g, '').trim();
  if (!unbracketed) return true;
  const words = unbracketed.split(/\s+/);
  return words.length > 0 && words.every(isChordToken);
}

function isPerformanceCue(l: string): boolean {
  if (isGuitarTabLine(l)) return true;
  if (/^\*.*\*?$/.test(l)) return true;
  if (/\*(?:piano|drum|guitar|bass|synth|acoustic|cymbal|swell|groove|breakdown|vamp|marching|snare|tom|layers|dynamics|build|all in|dropdown|hits|tempo|soft|loud)\b/i.test(l)) return true;
  if (/^(?:guitar|marching|breakdown|instrumental|vamp|intro|interlude|outro|coda|solo):?$/i.test(l)) return true;
  if (/^(?:capo\s+on|capo\s*:|tuning\s*:|tempo\s*:|bpm\s*:)/i.test(l)) return true;
  if (/^\((?:repeat|instrumental|solo|key\s+change|\d+x|x\d+|all|band|drums|build|to verse)[^)]*\)$/i.test(l)) return true;
  if (/^[A-G][b#]?=\d+/i.test(l)) return true;
  return false;
}

/**
 * Post-processes any ProPresenter lyrics string (including cached AI output)
 * to strip stray chord-only lines (e.g. "Bb Bb Eb Eb x2"), guitar tabs,
 * and empty/instrumental-only section headers (e.g. "[Intro]" with no lyrics).
 */
export function sanitizeProPresenterLyrics(raw: string): string {
  if (!raw || !raw.trim()) return '';
  const blocks = raw.trim().split(/\r?\n\r?\n+/);
  const cleanedBlocks: string[] = [];

  for (const block of blocks) {
    const rawLines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const keptLines: string[] = [];
    let header: string | null = null;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (i === 0 && /^\[[^\]]+\]$/.test(line)) {
        header = line;
        continue;
      }
      if (isPerformanceCue(line) || isChordLine(line)) continue;
      keptLines.push(line);
    }

    if (header) {
      if (keptLines.length > 0) {
        cleanedBlocks.push(`${header}\n${keptLines.join('\n')}`);
      }
      // If a header block has 0 lyric lines (e.g. [Intro] followed only by chords), drop it unless next block is a continuation without a header
    } else if (keptLines.length > 0) {
      cleanedBlocks.push(keptLines.join('\n'));
    }
  }

  return cleanedBlocks.join('\n\n');
}

/**
 * Formats sanitized ProPresenter lyrics into either:
 * - linesPerSlide = 2: pairs of 2 lines separated by a blank line (\n\n) per slide
 * - linesPerSlide = 1: continuous lines with NO blank lines inside each section (1 line per slide)
 */
export function formatProPresenterSlideLayout(raw: string, linesPerSlide: 1 | 2 = 2): string {
  const sanitized = sanitizeProPresenterLyrics(raw);
  if (!sanitized) return '';

  const allLines = sanitized.split(/\r?\n/).map((l) => l.trim());
  const groups: { header: string; lines: string[] }[] = [];
  let current: { header: string; lines: string[] } | null = null;

  for (const line of allLines) {
    if (!line) continue;
    if (/^\[[^\]]+\]$/.test(line)) {
      if (current && current.lines.length > 0) {
        groups.push(current);
      }
      current = { header: line, lines: [] };
      continue;
    }
    if (!current) {
      current = { header: '[Verse 1]', lines: [] };
    }
    current.lines.push(line);
  }
  if (current && current.lines.length > 0) {
    groups.push(current);
  }

  return groups
    .map((g) => {
      if (linesPerSlide === 1) {
        return `${g.header}\n${g.lines.join('\n')}`;
      }
      const slides: string[] = [];
      for (let i = 0; i < g.lines.length; i += 2) {
        if (i + 1 < g.lines.length) {
          slides.push(`${g.lines[i]}\n${g.lines[i + 1]}`);
        } else {
          slides.push(g.lines[i]);
        }
      }
      return `${g.header}\n${slides.join('\n\n')}`;
    })
    .join('\n\n');
}

export function matchSectionHeader(raw: string): string | null {
  const line = raw.trim();
  const m = line.match(/^\[?\s*(intro|verse\s*\d*|[a-g][b#]?erse\s*\d*|pre-?chorus\s*\d*|[a-g][b#]?re-?chorus\s*\d*|half-?chorus\s*\d*|post-?chorus\s*\d*|chorus\s*\d*|[a-g][b#]?horus\s*\d*|bridge\s*\d*|[a-g][b#]?ridge\s*\d*|interlude|instrumental\s*\d*|tag\s*\d*|outro|ending|refrain|vamp|coda)\b([^\]\n]*)/i);
  if (!m) return null;

  let type = m[1].toLowerCase().replace(/[\s-]/g, '');
  const rest = m[2] || '';

  const numMatch = m[1].match(/\d+/) || rest.match(/\d+/);
  const num = numMatch ? numMatch[0] : '';

  // Recover from accidental transposition (e.g. Dhorus -> chorus, C#ridge -> bridge)
  if (type.endsWith('horus') && !type.includes('pre')) type = 'chorus';
  if (type.endsWith('rechorus')) type = 'prechorus';
  if (type.endsWith('ridge')) type = 'bridge';
  if (type.endsWith('erse')) type = 'verse';

  if (type.startsWith('intro')) return '[Intro]';
  if (type.startsWith('verse')) return `[Verse ${num || 1}]`;
  if (type.startsWith('prechorus') || type.startsWith('pc')) return num ? `[Pre-Chorus ${num}]` : '[Pre-Chorus]';
  if (type.startsWith('postchorus') || type.startsWith('refrain') || type.startsWith('tag')) return num ? `[Tag ${num}]` : '[Tag]';
  if (type.startsWith('halfchorus') || type.startsWith('chorus')) return num ? `[Chorus ${num}]` : '[Chorus]';
  if (type.startsWith('bridge')) return num ? `[Bridge ${num}]` : '[Bridge]';
  if (type.startsWith('interlude') || type.startsWith('instrumental') || type.startsWith('vamp')) return '[Interlude]';
  if (type.startsWith('outro') || type.startsWith('coda')) return '[Outro]';
  if (type.startsWith('ending')) return '[Ending]';
  return null;
}

/**
 * Normalizes section headers to standard ProPresenter 7 bracket group names.
 * e.g. "VERSE 1" -> "[Verse 1]", "Chorus" -> "[Chorus]"
 */
export function normalizeProPresenterHeader(rawHeader: string): string {
  return matchSectionHeader(rawHeader) || '[Verse 1]';
}

/**
 * Formats a song's lyrics for direct import into ProPresenter 7 from Clipboard.
 * If song has saved proPresenterLyrics, returns it immediately.
 */
export function formatSongForProPresenter(song: Song | null, parsedLines?: SheetLine[]): string {
  if (!song) return '';

  // If already saved with AI cleanup, sanitize & return immediately
  if (song.proPresenterLyrics && song.proPresenterLyrics.trim()) {
    return sanitizeProPresenterLyrics(song.proPresenterLyrics);
  }

  const rawText = (song.lyrics && song.lyrics.trim()) || (song.chords && song.chords.trim()) || '';
  if (!rawText) return '';

  const cleanText = decodeHtmlEntities(rawText);
  const rawLines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

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

  interface SectionGroup {
    header: string;
    lines: string[];
  }

  const sections: SectionGroup[] = [];
  let currentGroup: SectionGroup | null = null;

  for (let i = 0; i < prefilteredLines.length; i++) {
    const line = prefilteredLines[i];

    const header = matchSectionHeader(line);
    if (header) {
      if (currentGroup && currentGroup.header === header) {
        continue;
      }
      if (currentGroup && currentGroup.lines.length > 0) {
        sections.push(currentGroup);
      }
      currentGroup = { header, lines: [] };
      continue;
    }

    if (isPerformanceCue(line)) continue;
    if (isChordLine(line)) continue;

    let lyric = line
      .replace(/\[[A-G][b#]?[^\]]*\]/g, '')
      .replace(/\*.*?\*/g, '')
      .replace(/\((?:repeat|\d+x)[^)]*\)/gi, '')
      .replace(/\[\d+x\]/gi, '')
      .trim();

    if (!lyric || isChordLine(lyric)) continue;

    if (!currentGroup) {
      currentGroup = { header: '[Verse 1]', lines: [] };
    }
    currentGroup.lines.push(lyric);
  }

  if (currentGroup && currentGroup.lines.length > 0) {
    sections.push(currentGroup);
  }

  const slidesOutput: string[] = [];
  for (const g of sections) {
    if (g.lines.length === 0) continue;
    const gSlides: string[] = [];
    for (let i = 0; i < g.lines.length; i += 2) {
      if (i + 1 < g.lines.length) {
        gSlides.push(`${g.lines[i]}\n${g.lines[i + 1]}`);
      } else {
        gSlides.push(g.lines[i]);
      }
    }
    slidesOutput.push(`${g.header}\n${gSlides.join('\n\n')}`);
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
    return { text: sanitizeProPresenterLyrics(song.proPresenterLyrics), cached: true };
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
        return { text: sanitizeProPresenterLyrics(data.proPresenterLyrics), cached: Boolean(data.cached) };
      }
    }
  } catch (err) {
    console.warn('[cleanSongWithAi] Server AI cleaner fallback to local cleaner:', err);
  }

  // Fallback to local rule-based cleaner
  const fallbackText = formatSongForProPresenter(song);
  return { text: sanitizeProPresenterLyrics(fallbackText), cached: false };
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
