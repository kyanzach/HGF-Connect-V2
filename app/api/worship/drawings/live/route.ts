// app/api/worship/drawings/live/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export interface LiveDrawingState {
  songId: string;
  strokes: any[];
  version: number;
  authorId: string;
  authorName: string;
  timestamp: number;
}

const globalDrawing = global as unknown as { __liveDrawingStore?: Map<string, LiveDrawingState> };
if (!globalDrawing.__liveDrawingStore) {
  globalDrawing.__liveDrawingStore = new Map<string, LiveDrawingState>();
}
const liveStore = globalDrawing.__liveDrawingStore;

const DATA_DIR = path.join(process.cwd(), 'data', 'worship');
const LIVE_DRAWINGS_FILE = path.join(DATA_DIR, 'live_drawings.json');

// Non-blocking disk backup
async function persistBackup(songId: string, state: LiveDrawingState) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    let existing: Record<string, LiveDrawingState> = {};
    try {
      const raw = await fs.readFile(LIVE_DRAWINGS_FILE, 'utf-8');
      existing = JSON.parse(raw);
    } catch (_) {}
    existing[songId] = state;
    await fs.writeFile(LIVE_DRAWINGS_FILE, JSON.stringify(existing), 'utf-8');
  } catch (_) {}
}

// GET /api/worship/drawings/live?songId=xxx -> ultra-fast microsecond in-memory response
export async function GET(req: NextRequest) {
  try {
    const songId = req.nextUrl.searchParams.get('songId');
    if (!songId) {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 });
    }

    let state = liveStore.get(songId);

    // Fallback to disk if memory was re-initialized
    if (!state) {
      try {
        const raw = await fs.readFile(LIVE_DRAWINGS_FILE, 'utf-8');
        const diskData = JSON.parse(raw);
        if (diskData[songId]) {
          state = diskData[songId];
          if (state) liveStore.set(songId, state);
        }
      } catch (_) {}
    }

    return NextResponse.json({
      ok: true,
      songId,
      strokes: state?.strokes || [],
      version: state?.version || 0,
      timestamp: state?.timestamp || 0,
      authorName: state?.authorName || 'MD',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Fetch failed' }, { status: 500 });
  }
}

// POST /api/worship/drawings/live -> MD live broadcast
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { songId, strokes, role, authorId, authorName } = body;

    if (!songId) {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 });
    }

    // Only MD role has authority to broadcast live drawings to the entire band
    const isMd = (role || '').toUpperCase() === 'MD' || (authorId || '').toLowerCase() === 'user-ren';
    if (!isMd) {
      return NextResponse.json({ error: 'Forbidden: only MD can broadcast live drawings' }, { status: 403 });
    }

    const state: LiveDrawingState = {
      songId: String(songId),
      strokes: Array.isArray(strokes) ? strokes : [],
      version: Date.now(),
      authorId: String(authorId || 'user-ren'),
      authorName: String(authorName || 'Ren (MD)'),
      timestamp: Date.now(),
    };

    liveStore.set(songId, state);

    // Non-blocking disk backup
    persistBackup(songId, state);

    // Also async update song definition in data/worship/songs/
    const songFile = path.join(DATA_DIR, 'songs', `${songId}.json`);
    fs.readFile(songFile, 'utf-8')
      .then((raw) => {
        const s = JSON.parse(raw);
        s.drawingStrokes = state.strokes;
        s.updatedAt = Date.now();
        return fs.writeFile(songFile, JSON.stringify(s, null, 2), 'utf-8');
      })
      .catch(() => {});

    return NextResponse.json({ ok: true, version: state.version, count: state.strokes.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Broadcast failed' }, { status: 500 });
  }
}

// DELETE /api/worship/drawings/live?songId=xxx (or clear all)
export async function DELETE(req: NextRequest) {
  try {
    const songId = req.nextUrl.searchParams.get('songId');
    if (songId) {
      liveStore.delete(songId);
      persistBackup(songId, {
        songId,
        strokes: [],
        version: Date.now(),
        authorId: '',
        authorName: '',
        timestamp: Date.now(),
      });
    } else {
      liveStore.clear();
      try {
        await fs.unlink(LIVE_DRAWINGS_FILE);
      } catch (_) {}
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}
