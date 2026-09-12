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
          artist: s.artist || '',
          key: s.key || '',
          tempo: s.tempo || null,
          timeSignature: s.timeSignature || '4/4',
          tags: s.tags || [],
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
    const { id, title, artist, key, originalKey, tempo, timeSignature, notes, lyrics, arrangement, tags } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Song title is required' }, { status: 400 });
    }

    const songId = id ? sanitize(id) : sanitize(title.toLowerCase().replace(/\s+/g, '-'));
    const songData = {
      id: songId,
      title: title.trim(),
      artist: (artist || '').trim(),
      key: key || '',
      originalKey: originalKey || key || '',
      tempo: Number(tempo) || null,
      timeSignature: timeSignature || '4/4',
      notes: notes || '',
      lyrics: lyrics || '',
      arrangement: Array.isArray(arrangement) ? arrangement : [],
      tags: Array.isArray(tags) ? tags : [],
      updatedAt: Date.now(),
    };

    const filePath = path.join(SONGS_DIR, `${songId}.json`);
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
