import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data', 'worship');
const USER_DRAWINGS_DIR = path.join(DATA_DIR, 'drawings');

function sanitize(name: string): string {
  return name.replace(/[^\w\s\-().]/g, '_').substring(0, 120).trim();
}

async function ensureDirs() {
  await fs.mkdir(USER_DRAWINGS_DIR, { recursive: true });
}

// GET /api/worship/drawings?userId=xxx&songId=xxx -> get personal user strokes
export async function GET(req: NextRequest) {
  try {
    await ensureDirs();
    const userId = req.nextUrl.searchParams.get('userId');
    const songId = req.nextUrl.searchParams.get('songId');

    if (!userId || !songId) {
      return NextResponse.json({ error: 'userId and songId required' }, { status: 400 });
    }

    const safeFile = `${sanitize(userId)}_${sanitize(songId)}.json`;
    const filePath = path.join(USER_DRAWINGS_DIR, safeFile);

    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return NextResponse.json({ ok: true, strokes: data.strokes || [] });
    } catch {
      return NextResponse.json({ ok: true, strokes: [] });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Fetch failed' }, { status: 500 });
  }
}

// POST /api/worship/drawings -> save personal user strokes
export async function POST(req: NextRequest) {
  try {
    await ensureDirs();
    const body = await req.json();
    const { userId, songId, strokes } = body;

    if (!userId || !songId) {
      return NextResponse.json({ error: 'userId and songId required' }, { status: 400 });
    }

    const safeFile = `${sanitize(userId)}_${sanitize(songId)}.json`;
    const filePath = path.join(USER_DRAWINGS_DIR, safeFile);

    const payload = {
      userId,
      songId,
      strokes: Array.isArray(strokes) ? strokes : [],
      updatedAt: Date.now(),
    };

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return NextResponse.json({ ok: true, count: payload.strokes.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Save failed' }, { status: 500 });
  }
}

// DELETE /api/worship/drawings?userId=xxx&songId=xxx -> delete personal user strokes
export async function DELETE(req: NextRequest) {
  try {
    await ensureDirs();
    const userId = req.nextUrl.searchParams.get('userId');
    const songId = req.nextUrl.searchParams.get('songId');

    if (!userId || !songId) {
      return NextResponse.json({ error: 'userId and songId required' }, { status: 400 });
    }

    const safeFile = `${sanitize(userId)}_${sanitize(songId)}.json`;
    const filePath = path.join(USER_DRAWINGS_DIR, safeFile);

    try {
      await fs.unlink(filePath);
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}
