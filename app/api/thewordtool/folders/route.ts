import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data', 'thewordtool');

function sanitize(name: string): string {
  return name.replace(/[^\w\s\-().]/g, '_').substring(0, 100).trim();
}

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function getFolderMeta(folderPath: string) {
  try {
    const raw = await fs.readFile(path.join(folderPath, '_meta.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { locked: false };
  }
}

// GET /api/thewordtool/folders → list all folders
export async function GET() {
  try {
    await ensureDir(DATA_DIR);

    let entries: string[] = [];
    try {
      const all = await fs.readdir(DATA_DIR, { withFileTypes: true });
      entries = all.filter(e => e.isDirectory()).map(e => e.name);
    } catch {
      return NextResponse.json([]);
    }

    // Auto-create "General" if no folders exist
    if (entries.length === 0) {
      const generalPath = path.join(DATA_DIR, 'General');
      await ensureDir(generalPath);
      await fs.writeFile(path.join(generalPath, '_meta.json'), JSON.stringify({ locked: false }));
      entries = ['General'];
    }

    const folders = [];
    for (const name of entries) {
      const folderPath = path.join(DATA_DIR, name);
      const meta = await getFolderMeta(folderPath);

      // Count scripts (exclude _meta.json)
      let scriptCount = 0;
      try {
        const files = await fs.readdir(folderPath);
        scriptCount = files.filter(f => f.endsWith('.json') && f !== '_meta.json').length;
      } catch {}

      folders.push({
        name,
        locked: !!meta.locked,
        scriptCount,
      });
    }

    folders.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(folders);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/thewordtool/folders → create folder { name }
export async function POST(req: NextRequest) {
  try {
    await ensureDir(DATA_DIR);
    const { name } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Folder name required' }, { status: 400 });
    }

    const safeName = sanitize(name);
    const folderPath = path.join(DATA_DIR, safeName);

    try {
      await fs.stat(folderPath);
      return NextResponse.json({ error: 'Folder already exists' }, { status: 409 });
    } catch { /* doesn't exist, good */ }

    await ensureDir(folderPath);
    await fs.writeFile(path.join(folderPath, '_meta.json'), JSON.stringify({ locked: false }));
    return NextResponse.json({ ok: true, name: safeName });
  } catch {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}

// PATCH /api/thewordtool/folders → update folder
// { name, action: 'rename' | 'lock' | 'unlock', newName?, password?, currentPassword? }
export async function PATCH(req: NextRequest) {
  try {
    await ensureDir(DATA_DIR);
    const { name, action, newName, password, currentPassword } = await req.json();
    if (!name || !action) {
      return NextResponse.json({ error: 'Missing name or action' }, { status: 400 });
    }

    const folderPath = path.join(DATA_DIR, sanitize(name));
    const meta = await getFolderMeta(folderPath);

    switch (action) {
      case 'rename': {
        if (!newName || !newName.trim()) {
          return NextResponse.json({ error: 'New name required' }, { status: 400 });
        }
        // If locked, verify password
        if (meta.locked) {
          if (!currentPassword || hashPassword(currentPassword) !== meta.passwordHash) {
            return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
          }
        }
        const newPath = path.join(DATA_DIR, sanitize(newName));
        try { await fs.stat(newPath); return NextResponse.json({ error: 'Name already taken' }, { status: 409 }); } catch {}
        await fs.rename(folderPath, newPath);
        return NextResponse.json({ ok: true, name: sanitize(newName) });
      }

      case 'lock': {
        if (!password || password.length < 1) {
          return NextResponse.json({ error: 'Password required' }, { status: 400 });
        }
        meta.locked = true;
        meta.passwordHash = hashPassword(password);
        await fs.writeFile(path.join(folderPath, '_meta.json'), JSON.stringify(meta));
        return NextResponse.json({ ok: true });
      }

      case 'unlock': {
        if (!currentPassword || hashPassword(currentPassword) !== meta.passwordHash) {
          return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
        }
        meta.locked = false;
        delete meta.passwordHash;
        await fs.writeFile(path.join(folderPath, '_meta.json'), JSON.stringify(meta));
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

// DELETE /api/thewordtool/folders → { name, password? }
export async function DELETE(req: NextRequest) {
  try {
    await ensureDir(DATA_DIR);
    const { name, password } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const folderPath = path.join(DATA_DIR, sanitize(name));
    const meta = await getFolderMeta(folderPath);

    if (meta.locked) {
      if (!password || hashPassword(password) !== meta.passwordHash) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
      }
    }

    await fs.rm(folderPath, { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
