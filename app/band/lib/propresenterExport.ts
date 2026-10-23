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

  // If already saved with AI cleanup, return immediately
  if (song.proPresenterLyrics && song.proPresenterLyrics.trim()) {
    return song.proPresenterLyrics.trim();
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
