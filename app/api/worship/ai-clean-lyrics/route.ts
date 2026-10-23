import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { callOpenAI } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data', 'worship');
const SONGS_DIR = path.join(DATA_DIR, 'songs');

function sanitize(name: string): string {
  return name.replace(/[^\w\s\-().]/g, '_').substring(0, 120).trim();
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

function isPureInstrumentalHeader(l: string): boolean {
  return /^\[?(intro|interlude|instrumental|vamp|coda|ending)/i.test(l);
}

function isSectionHeader(l: string): boolean {
  return /^\[?(verse|chorus|pre-chorus|prechorus|bridge|tag|outro|refrain)/i.test(l) && !/[a-g][b#]?m/i.test(l);
}

function normalizeHeader(raw: string): string {
  let clean = raw.replace(/[\[\]*:]/g, '').trim();
  clean = clean.replace(/:.*$/, '').trim();
  clean = clean.replace(/[-–—].*$/, '').trim();
  clean = clean.replace(/\*.*\*?$/, '').trim();

  const low = clean.toLowerCase();
  if (low.startsWith('verse') || low.startsWith('v')) {
    const m = low.match(/\d+/);
    const num = m ? m[0] : '1';
    return `Verse ${num}`;
  }
  if (low.includes('chorus') && !low.includes('pre')) {
    const num = low.match(/\d+/);
    return num ? `Chorus ${num[0]}` : 'Chorus';
  }
  if (low.includes('pre')) {
    const num = low.match(/\d+/);
    return num ? `Pre-Chorus ${num[0]}` : 'Pre-Chorus';
  }
  if (low.includes('bridge') || low.startsWith('b')) {
    const num = low.match(/\d+/);
    return num ? `Bridge ${num[0]}` : 'Bridge';
  }
  if (low.includes('tag')) return 'Tag';
  if (low.includes('outro')) return 'Outro';
  if (low.includes('refrain')) return 'Refrain';
  return clean;
}

/**
 * Transforms raw song chords and lyrics into standard ProPresenter 7 slides.
 * - Strips chords, tablature, and cues
 * - Standardizes headers to slide groups
 * - Pairs lyrics into strictly 2 lines per slide
 */
export function formatProPresenterText(rawLines: string[], removeIndices: Set<number> = new Set()): string {
  interface Group {
    header: string;
    lines: string[];
  }
  const groups: Group[] = [];
  let currentGroup: Group = { header: 'Verse 1', lines: [] };

  for (let i = 0; i < rawLines.length; i++) {
    if (removeIndices.has(i)) continue;
    let line = rawLines[i];

    // Extract bracketed headers if mixed with notes, e.g. "[Chorus] *Band in softly*"
    const bracketedMatch = line.match(/^(\[(?:verse|chorus|pre-chorus|prechorus|bridge|tag|outro|refrain)[^\]]*\])(?:\s*\*.*\*?)?$/i);
    if (bracketedMatch) {
      line = bracketedMatch[1];
    }

    if (isPerformanceCue(line)) continue;
    if (isChordLine(line)) continue;

    // Check if instrumental header has lyrics underneath
    if (isPureInstrumentalHeader(line)) {
      let hasLyrics = false;
      for (let j = i + 1; j < rawLines.length; j++) {
        let next = rawLines[j];
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
      if (currentGroup.lines.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = { header: normalizeHeader(line), lines: [] };
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

  if (currentGroup.lines.length > 0) {
    groups.push(currentGroup);
  }

  const slidesOutput: string[] = [];
  for (const g of groups) {
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { songId, title, artist, chords, lyrics, forceRefresh } = body;

    const safeId = sanitize(songId || (title || '').toLowerCase().replace(/\s+/g, '-'));
    const filePath = safeId ? path.join(SONGS_DIR, `${safeId}.json`) : null;

    let existingSong: any = null;
    if (filePath) {
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        existingSong = JSON.parse(raw);
      } catch (_) {}
    }

    // Return saved ProPresenter lyrics immediately if available and not forcing refresh
    if (!forceRefresh && existingSong?.proPresenterLyrics && existingSong.proPresenterLyrics.trim()) {
      return NextResponse.json({
        ok: true,
        cached: true,
        proPresenterLyrics: existingSong.proPresenterLyrics,
      });
    }

    const rawInput = (lyrics && lyrics.trim()) || (chords && chords.trim()) || existingSong?.lyrics || existingSong?.chords || '';
    if (!rawInput) {
      return NextResponse.json({ error: 'No chords or lyrics available to clean.' }, { status: 400 });
    }

    // 1. Pre-filter lines & collapse multi-line asterisks
    const rawLines = rawInput.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
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

    // 2. AI Line-Classification Pass (Lowest credit LLM: gpt-4o-mini)
    const removeIndices = new Set<number>();
    try {
      const numbered = prefilteredLines.map((l, i) => `${i + 1}: ${l}`).join('\n');
      const systemPrompt = `You are a church media AI specialist for House of Grace Fellowship.
Examine this numbered worship chart. Identify line numbers that are NOT vocal lyrics sung by the congregation or are unnecessary for ProPresenter projection slides:
- Performance notes and band dynamics (e.g. *Piano only*, *Band in softly*, *tom groove*, *breakdown*, *dropdown*, *marching snare*, *add light layers*, *bigger & building*, *heavy toms*)
- Musical cues or remarks in asterisks *...* or parentheses (e.g. "(repeat)", "(to Verse)")
- Pure instrumental / empty section headers like [Intro], [Interlude], [Vamp], [Instrumental], [Ending] that have no lyrics
- Pure chord lines
Return JSON strictly in this format: { "removeLineIndices": [1, 2, 5...] }`;

      const aiReply = await callOpenAI({
        model: 'gpt-4o-mini',
        systemPrompt,
        userPrompt: `Song: ${title || existingSong?.title || 'Worship Song'}\nArtist: ${artist || existingSong?.artist || ''}\n\n${numbered}`,
        jsonMode: true,
        temperature: 0.1,
        timeoutMs: 15000,
      });

      const parsedJson = JSON.parse(aiReply);
      if (Array.isArray(parsedJson?.removeLineIndices)) {
        for (const idx of parsedJson.removeLineIndices) {
          if (typeof idx === 'number' && idx >= 1) {
            removeIndices.add(idx - 1);
          }
        }
      }
    } catch (aiErr: any) {
      console.warn('[ai-clean-lyrics] AI classification fallback to rule-based cleaner:', aiErr.message);
    }

    // 3. Format into ProPresenter 7 strict 2 lines per slide
    const finalPro7Text = formatProPresenterText(prefilteredLines, removeIndices);

    // 4. Separately save to song JSON file on disk
    if (filePath && existingSong) {
      try {
        existingSong.proPresenterLyrics = finalPro7Text;
        existingSong.updatedAt = Date.now();
        await fs.writeFile(filePath, JSON.stringify(existingSong, null, 2), 'utf-8');
      } catch (saveErr: any) {
        console.error('[ai-clean-lyrics] Failed to save proPresenterLyrics to file:', saveErr.message);
      }
    }

    return NextResponse.json({
      ok: true,
      cached: false,
      proPresenterLyrics: finalPro7Text,
    });
  } catch (err: any) {
    console.error('[ai-clean-lyrics] Endpoint error:', err);
    return NextResponse.json({ error: err.message || 'AI cleanup failed' }, { status: 500 });
  }
}
