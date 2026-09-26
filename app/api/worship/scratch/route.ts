import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data', 'worship');
const SCRATCH_DIR = path.join(DATA_DIR, 'scratch');
const MD_SCRATCH_DIR = path.join(SCRATCH_DIR, 'md');

function sanitize(name: string): string {
  return name.replace(/[^\w\s\-().]/g, '_').substring(0, 120).trim();
}

async function ensureDirs(userId?: string) {
  await fs.mkdir(MD_SCRATCH_DIR, { recursive: true });
  if (userId) {
    const userDir = path.join(SCRATCH_DIR, `user_${sanitize(userId)}`);
    await fs.mkdir(userDir, { recursive: true });
  }
}

// GET /api/worship/scratch?songId=xxx&userId=yyy or ?userId=yyy for all user custom sheets
export async function GET(req: NextRequest) {
  try {
    const songId = req.nextUrl.searchParams.get('songId');
    const userId = req.nextUrl.searchParams.get('userId');

    await ensureDirs(userId || undefined);

    // If no songId provided but userId is given, fetch all personal customized lyrics for this user
    if (!songId && userId) {
      const cleanUserId = sanitize(userId);
      const userDir = path.join(SCRATCH_DIR, `user_${cleanUserId}`);
      const lyricsMap: Record<string, string> = {};
      try {
        const files = await fs.readdir(userDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const sid = file.replace('.json', '');
            try {
              const raw = await fs.readFile(path.join(userDir, file), 'utf-8');
              const data = JSON.parse(raw);
              if (data.customChords) {
                lyricsMap[sid] = data.customChords;
              }
            } catch {}
          }
        }
      } catch {}
      return NextResponse.json({ ok: true, lyricsMap });
    }

    if (!songId) {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 });
    }

    const cleanSongId = sanitize(songId);

    let mdNote: { text: string; author?: string; updatedAt?: number } | null = null;
    let userNote: { text: string; customChords?: string; updatedAt?: number } | null = null;

    // 1. Fetch MD Global Note if exists
    try {
      const mdFilePath = path.join(MD_SCRATCH_DIR, `${cleanSongId}.json`);
      const raw = await fs.readFile(mdFilePath, 'utf-8');
      mdNote = JSON.parse(raw);
    } catch {}

    // 2. Fetch User Private Note if userId is provided
    if (userId) {
      try {
        const cleanUserId = sanitize(userId);
        const userFilePath = path.join(SCRATCH_DIR, `user_${cleanUserId}`, `${cleanSongId}.json`);
        const raw = await fs.readFile(userFilePath, 'utf-8');
        userNote = JSON.parse(raw);
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      mdNote: mdNote || { text: '', author: '', updatedAt: 0 },
      userNote: userNote || { text: '', updatedAt: 0 },
      customChords: userNote?.customChords || '',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch scratchpad' }, { status: 500 });
  }
}

// POST /api/worship/scratch -> Saves MD note, User private note, or User customized chords
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const songId = (body.songId || '').trim();
    const userId = (body.userId || '').trim();
    const text = body.text !== undefined ? body.text.toString() : undefined;
    const customChords = body.customChords !== undefined ? String(body.customChords) : undefined;
    const isMdGlobal = body.isMdGlobal === true || body.isMdGlobal === 'true';
    const authorName = (body.authorName || 'Musical Director').trim();

    if (!songId) {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 });
    }

    const cleanSongId = sanitize(songId);
    await ensureDirs(userId || undefined);

    if (isMdGlobal) {
      // Save to MD Global Storage
      const mdFilePath = path.join(MD_SCRATCH_DIR, `${cleanSongId}.json`);
      let existing: any = {};
      try {
        const raw = await fs.readFile(mdFilePath, 'utf-8');
        existing = JSON.parse(raw);
      } catch {}

      const payload = {
        ...existing,
        text: text !== undefined ? text : existing.text || '',
        author: authorName,
        updatedAt: Date.now(),
      };
      await fs.writeFile(mdFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      return NextResponse.json({ ok: true, type: 'md', data: payload });
    } else {
      // Save to User Private Storage
      if (!userId) {
        return NextResponse.json({ error: 'userId is required for personal notes / sheets' }, { status: 400 });
      }
      const cleanUserId = sanitize(userId);
      const userDir = path.join(SCRATCH_DIR, `user_${cleanUserId}`);
      await fs.mkdir(userDir, { recursive: true });

      const userFilePath = path.join(userDir, `${cleanSongId}.json`);
      let existing: any = {};
      try {
        const raw = await fs.readFile(userFilePath, 'utf-8');
        existing = JSON.parse(raw);
      } catch {}

      const payload: any = {
        ...existing,
        updatedAt: Date.now(),
      };
      if (text !== undefined) payload.text = text;
      if (customChords !== undefined) payload.customChords = customChords;

      await fs.writeFile(userFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      return NextResponse.json({ ok: true, type: 'user', data: payload });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save scratchpad' }, { status: 500 });
  }
}

// DELETE /api/worship/scratch?userId=xxx&songId=yyy -> Revert personal sheet to Church Master
export async function DELETE(req: NextRequest) {
  try {
    const songId = req.nextUrl.searchParams.get('songId');
    const userId = req.nextUrl.searchParams.get('userId');

    if (!songId || !userId) {
      return NextResponse.json({ error: 'songId and userId are required' }, { status: 400 });
    }

    const cleanSongId = sanitize(songId);
    const cleanUserId = sanitize(userId);
    const userFilePath = path.join(SCRATCH_DIR, `user_${cleanUserId}`, `${cleanSongId}.json`);

    try {
      const raw = await fs.readFile(userFilePath, 'utf-8');
      const existing = JSON.parse(raw);
      // Remove custom chords override, retain notes if any
      delete existing.customChords;
      if (!existing.text || existing.text.trim() === '') {
        await fs.unlink(userFilePath).catch(() => {});
      } else {
        await fs.writeFile(userFilePath, JSON.stringify(existing, null, 2), 'utf-8');
      }
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to revert sheet' }, { status: 500 });
  }
}
