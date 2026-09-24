import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data', 'worship');
const SONGS_DIR = path.join(DATA_DIR, 'songs');

function sanitize(name: string): string {
  return name.replace(/[^\w\s\-().]/g, '_').substring(0, 120).trim();
}

async function ensureDirs() {
  await fs.mkdir(SONGS_DIR, { recursive: true });
}

// GET /api/worship?id=xxx or GET /api/worship -> list all songs
export async function GET(req: NextRequest) {
  try {
    await ensureDirs();
    const id = req.nextUrl.searchParams.get('id');

    if (id) {
      const filePath = path.join(SONGS_DIR, `${sanitize(id)}.json`);
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        return NextResponse.json(JSON.parse(raw));
      } catch {
        return NextResponse.json({ error: 'Song not found' }, { status: 404 });
      }
    }

    // List all songs
    const files = await fs.readdir(SONGS_DIR);
    const songs = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(SONGS_DIR, f), 'utf-8');
        const s = JSON.parse(raw);
        songs.push({
          id: s.id || f.replace('.json', ''),
          title: s.title || 'Untitled Song',
          alternativeTitle: s.alternativeTitle || '',
          artist: s.artist || '',
          key: s.key || '',
          originalKey: s.originalKey || s.key || '',
          chords: s.chords || '',
          chordFormat: s.chordFormat || 'chords_over_lyrics',
          capo: s.capo || '0',
          tempo: s.tempo || null,
          timeSignature: s.timeSignature || '4/4',
          duration: s.duration || '',
          sectionOrder: s.sectionOrder || '',
          songNumber: s.songNumber || '',
          copyright: s.copyright || '',
          webUrl: s.webUrl || '',
          notes: s.notes || '',
          exhortation: s.exhortation || '',
          lyrics: s.lyrics || '',
          tags: s.tags || [],
          audioTrack: s.audioTrack || null,
          useBacktrack: s.useBacktrack !== undefined ? !!s.useBacktrack : true,
          drawingStrokes: s.drawingStrokes || [],
          updatedAt: s.updatedAt || Date.now(),
        });
      } catch {}
    }

    songs.sort((a, b) => a.title.localeCompare(b.title));
    return NextResponse.json(songs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/worship -> save or update song
export async function POST(req: NextRequest) {
  try {
    await ensureDirs();
    const body = await req.json();
    const {
      id,
      title,
      alternativeTitle,
      artist,
      key,
      originalKey,
      chords,
      chordFormat,
      capo,
      tempo,
      timeSignature,
      duration,
      sectionOrder,
      songNumber,
      copyright,
      webUrl,
      notes,
      exhortation,
      lyrics,
      arrangement,
      tags,
      audioTrack,
      drawingStrokes,
    } = body;

    const songId = id ? sanitize(id) : sanitize((title || '').toLowerCase().replace(/\s+/g, '-'));
    if (!songId) {
      return NextResponse.json({ error: 'Song id or title is required' }, { status: 400 });
    }

    const filePath = path.join(SONGS_DIR, `${songId}.json`);
    let existing: any = {};
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      existing = JSON.parse(raw);
    } catch {}

    const resolvedTitle = (title && typeof title === 'string' && title.trim())
      ? title.trim()
      : (existing.title || 'Untitled Song');

    const songData = {
      id: songId,
      title: resolvedTitle,
      alternativeTitle: alternativeTitle !== undefined ? (alternativeTitle || '').trim() : (existing.alternativeTitle || ''),
      artist: artist !== undefined ? (artist || '').trim() : (existing.artist || ''),
      key: key !== undefined ? key : (existing.key || ''),
      originalKey: originalKey !== undefined ? originalKey : (existing.originalKey || existing.key || key || ''),
      chords: chords !== undefined ? chords : (existing.chords || ''),
      chordFormat: chordFormat !== undefined ? chordFormat : (existing.chordFormat || 'chords_over_lyrics'),
      capo: capo !== undefined ? capo : (existing.capo || '0'),
      tempo: tempo !== undefined ? (Number(tempo) || null) : (existing.tempo || null),
      timeSignature: timeSignature !== undefined ? timeSignature : (existing.timeSignature || '4/4'),
      duration: duration !== undefined ? (duration || '').trim() : (existing.duration || ''),
      sectionOrder: sectionOrder !== undefined ? (sectionOrder || '').trim() : (existing.sectionOrder || ''),
      songNumber: songNumber !== undefined ? (songNumber || '').trim() : (existing.songNumber || ''),
      copyright: copyright !== undefined ? (copyright || '').trim() : (existing.copyright || ''),
      webUrl: webUrl !== undefined ? (webUrl || '').trim() : (existing.webUrl || ''),
      notes: notes !== undefined ? notes : (existing.notes || ''),
      exhortation: exhortation !== undefined ? exhortation : (existing.exhortation || ''),
      lyrics: lyrics !== undefined ? lyrics : (existing.lyrics || ''),
      arrangement: Array.isArray(arrangement) ? arrangement : (existing.arrangement || []),
      tags: Array.isArray(tags) ? tags : (existing.tags || []),
      audioTrack: audioTrack !== undefined ? audioTrack : (existing.audioTrack || null),
      useBacktrack: body.useBacktrack !== undefined ? !!body.useBacktrack : (existing.useBacktrack !== undefined ? existing.useBacktrack : true),
      drawingStrokes: Array.isArray(drawingStrokes) ? drawingStrokes : (existing.drawingStrokes || []),
      updatedAt: Math.max(Number(body.updatedAt) || 0, Date.now()),
    };

    await fs.writeFile(filePath, JSON.stringify(songData, null, 2), 'utf-8');

    return NextResponse.json({ ok: true, song: songData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Save failed' }, { status: 500 });
  }
}

// DELETE /api/worship?id=xxx -> delete song
export async function DELETE(req: NextRequest) {
  try {
    await ensureDirs();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Song id required' }, { status: 400 });
    }

    const filePath = path.join(SONGS_DIR, `${sanitize(id)}.json`);
    try {
      await fs.unlink(filePath);
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}
