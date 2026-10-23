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
  const m = line.match(/^\[?\s*(intro|verse\s*\d*|pre-?chorus\s*\d*|half-?chorus\s*\d*|post-?chorus\s*\d*|chorus\s*\d*|bridge\s*\d*|interlude|instrumental\s*\d*|tag\s*\d*|outro|ending|refrain|vamp|coda)\b([^\]\n]*)/i);
  if (!m) return null;

  const type = m[1].toLowerCase().replace(/[\s-]/g, '');
  const rest = m[2] || '';

  const numMatch = m[1].match(/\d+/) || rest.match(/\d+/);
  const num = numMatch ? numMatch[0] : '';

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
 * Robust deterministic cleaner that formats lyrics strictly for ProPresenter:
 * - Square bracket group labels matching exact whitelist:
 *   [Intro], [Verse #], [Pre-Chorus #], [Chorus #], [Bridge #], [Interlude], [Tag], [Outro], [Ending]
 * - Strips chords, performance cues, and HTML entities
 * - Pairs lyrics into strictly 2 lines per slide without blank lines in between
 * - Uses 2 line breaks (\n\n) between slides and groups
 */
export function cleanAndFormatLyrics(rawText: string): string {
  const cleanText = decodeHtmlEntities(rawText || '');
  const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const filtered: string[] = [];
  let inAsterisk = false;
  for (const line of lines) {
    if (!inAsterisk && line.includes('*') && (line.match(/\*/g) || []).length % 2 === 1) {
      const before = line.substring(0, line.indexOf('*')).trim();
      if (before) filtered.push(before);
      inAsterisk = true;
      continue;
    }
    if (inAsterisk) {
      if (line.includes('*')) {
        inAsterisk = false;
        const after = line.substring(line.lastIndexOf('*') + 1).trim();
        if (after) filtered.push(after);
      }
      continue;
    }
    filtered.push(line);
  }

  interface Group {
    header: string;
    lines: string[];
  }
  const groups: Group[] = [];
  let currentGroup: Group | null = null;

  for (let i = 0; i < filtered.length; i++) {
    const line = filtered[i];

    const header = matchSectionHeader(line);
    if (header) {
      // Merge immediately consecutive identical headers
      if (currentGroup && currentGroup.header === header) {
        continue;
      }
      if (currentGroup && currentGroup.lines.length > 0) {
        groups.push(currentGroup);
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
    groups.push(currentGroup);
  }

  const outputSections: string[] = [];
  for (const g of groups) {
    if (g.lines.length === 0) continue;
    const slides: string[] = [];
    for (let i = 0; i < g.lines.length; i += 2) {
      if (i + 1 < g.lines.length) {
        slides.push(`${g.lines[i]}\n${g.lines[i + 1]}`);
      } else {
        slides.push(g.lines[i]);
      }
    }
    outputSections.push(`${g.header}\n${slides.join('\n\n')}`);
  }

  return outputSections.join('\n\n');
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
        proPresenterLyrics: existingSong.proPresenterLyrics.trim(),
      });
    }

    const rawInput = (lyrics && lyrics.trim()) || (chords && chords.trim()) || existingSong?.lyrics || existingSong?.chords || '';
    if (!rawInput) {
      return NextResponse.json({ error: 'No chords or lyrics available to clean.' }, { status: 400 });
    }

    // Deterministic formatting as primary guaranteed foundation
    const deterministicClean = cleanAndFormatLyrics(rawInput);

    // AI Trainer Prompt as requested
    const systemPrompt = `Format the lyrics, identify the groups and add a label for each group in bracket format, example [Verse 1], [Verse 2], [Chorus], [Bridge], etc. And finally format it as 2 line breaks. There should be no line space in between the 2 lines. Also clean any copied format or html character. Only use the following formats, and do not add anything, hashtag represents sequence numbers, only use any of the group label below if it was used in original song [you can search the web]:

[Intro]
[Verse #]
[Pre-Chorus #]
[Chorus #]
[Bridge #]
[Interlude] or [Tag]
[Outro] or [Ending]`;

    let finalPro7Text = deterministicClean;

    try {
      const aiReply = await callOpenAI({
        model: 'gpt-4o-mini',
        systemPrompt,
        userPrompt: `Song: ${title || existingSong?.title || 'Worship Song'}\nArtist: ${artist || existingSong?.artist || ''}\n\n${rawInput}`,
        temperature: 0.1,
        timeoutMs: 15000,
      });

      // Verify AI reply is not truncated and contains valid brackets
      if (
        aiReply &&
        aiReply.length > deterministicClean.length * 0.6 &&
        aiReply.includes('[') &&
        aiReply.includes(']') &&
        !aiReply.includes('content_filter')
      ) {
        // Re-run through deterministic cleaner to enforce 100% bracket whitelist and 2-line slides
        const normalizedAiText = cleanAndFormatLyrics(aiReply);
        if (normalizedAiText.length > 50) {
          finalPro7Text = normalizedAiText;
        }
      }
    } catch (aiErr: any) {
      console.warn('[ai-clean-lyrics] AI completion fallback to deterministic cleaner:', aiErr?.message || aiErr);
    }

    // Separately save to song JSON file on disk
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
