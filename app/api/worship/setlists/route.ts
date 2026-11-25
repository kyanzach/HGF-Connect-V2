import { sortSetlistsUpcomingFirst } from '@/app/band/lib/sortSetlists';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data', 'worship');
const SETLISTS_DIR = path.join(DATA_DIR, 'setlists');

const globalCache = global as unknown as {
  __worshipSetlistsCache?: { json: string; etag: string };
};

function invalidateSetlistsCache() {
  globalCache.__worshipSetlistsCache = undefined;
}

function sanitize(name: string): string {
  return name.replace(/[^\w\s\-().]/g, '_').substring(0, 120).trim();
}

async function ensureDirs() {
  await fs.mkdir(SETLISTS_DIR, { recursive: true });
}

// GET /api/worship/setlists?id=xxx or GET /api/worship/setlists -> list all setlists
export async function GET(req: NextRequest) {
  try {
    await ensureDirs();
    const id = req.nextUrl.searchParams.get('id');

    if (id) {
      const filePath = path.join(SETLISTS_DIR, `${sanitize(id)}.json`);
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        return NextResponse.json(JSON.parse(raw));
      } catch {
        return NextResponse.json({ error: 'Setlist not found' }, { status: 404 });
      }
    }

    if (!globalCache.__worshipSetlistsCache) {
      const files = await fs.readdir(SETLISTS_DIR);
      const setlists = [];
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        try {
          const raw = await fs.readFile(path.join(SETLISTS_DIR, f), 'utf-8');
          const s = JSON.parse(raw);
          setlists.push({
            id: s.id || f.replace('.json', ''),
            name: s.name || 'Untitled Setlist',
            serviceDate: s.serviceDate || '',
            leader: s.leader || '',
            songCount: Array.isArray(s.songs) ? s.songs.length : 0,
            songs: Array.isArray(s.songs) ? s.songs : [],
            updatedAt: s.updatedAt || Date.now(),
          });
        } catch {}
      }

      const sorted = sortSetlistsUpcomingFirst(setlists);
      const json = JSON.stringify(sorted);
      const etag = `"${crypto.createHash('md5').update(json).digest('hex')}"`;
      globalCache.__worshipSetlistsCache = { json, etag };
    }

    const cached = globalCache.__worshipSetlistsCache;
    if (req.headers.get('if-none-match') === cached.etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: cached.etag,
          'Cache-Control': 'no-cache',
        },
      });
    }

    return new NextResponse(cached.json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ETag: cached.etag,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/worship/setlists -> save or update setlist
export async function POST(req: NextRequest) {
  try {
    await ensureDirs();
    const body = await req.json();
    const { id, name, serviceDate, leader, songs, notes } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Setlist name is required' }, { status: 400 });
    }

    const setlistId = id ? sanitize(id) : sanitize(name.toLowerCase().replace(/\s+/g, '-'));
    const setlistData = {
      id: setlistId,
      name: name.trim(),
      serviceDate: serviceDate || new Date().toISOString().split('T')[0],
      leader: (leader || '').trim(),
      songs: Array.isArray(songs) ? songs : [],
      notes: notes || '',
      updatedAt: Date.now(),
    };

    const filePath = path.join(SETLISTS_DIR, `${setlistId}.json`);
    await fs.writeFile(filePath, JSON.stringify(setlistData, null, 2), 'utf-8');
    invalidateSetlistsCache();

    return NextResponse.json({ ok: true, setlist: setlistData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Save failed' }, { status: 500 });
  }
}

// DELETE /api/worship/setlists?id=xxx -> delete setlist
export async function DELETE(req: NextRequest) {
  try {
    await ensureDirs();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Setlist id required' }, { status: 400 });
    }

    const filePath = path.join(SETLISTS_DIR, `${sanitize(id)}.json`);
    try {
      await fs.unlink(filePath);
      invalidateSetlistsCache();
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: 'Setlist not found' }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}
