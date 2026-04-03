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

async function verifyFolderAccess(folderName: string, password?: string): Promise<{ ok: boolean; error?: string }> {
  const folderPath = path.join(DATA_DIR, sanitize(folderName));
  const meta = await getFolderMeta(folderPath);
  if (meta.locked) {
    if (!password) return { ok: false, error: 'This folder is locked. Password required.' };
    if (hashPassword(password) !== meta.passwordHash) return { ok: false, error: 'Incorrect password.' };
  }
  return { ok: true };
}

// GET /api/thewordtool?folder=xxx → list scripts in folder
// GET /api/thewordtool?folder=xxx&name=yyy → get specific script
// (password passed as header X-Folder-Password for locked folders)
export async function GET(req: NextRequest) {
  try {
    await ensureDir(DATA_DIR);
    const folder = req.nextUrl.searchParams.get('folder');
    const name = req.nextUrl.searchParams.get('name');
    const password = req.headers.get('x-folder-password') || undefined;

    if (!folder) {
      return NextResponse.json({ error: 'folder param required' }, { status: 400 });
    }

    const folderPath = path.join(DATA_DIR, sanitize(folder));

    // Check folder exists
    try { await fs.stat(folderPath); } catch {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Verify access
    const access = await verifyFolderAccess(folder, password);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 });

    if (name) {
      // Get specific script
      const filePath = path.join(folderPath, `${sanitize(name)}.json`);
      try {
        const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        return NextResponse.json(data);
      } catch {
        return NextResponse.json({ error: 'Script not found' }, { status: 404 });
      }
    }

    // List scripts in folder
    const files = await fs.readdir(folderPath);
    const scripts = [];
    for (const f of files) {
      if (!f.endsWith('.json') || f === '_meta.json') continue;
      try {
        const raw = await fs.readFile(path.join(folderPath, f), 'utf-8');
        const data = JSON.parse(raw);
        scripts.push({ name: data.name, updatedAt: data.updatedAt });
      } catch { /* skip corrupt */ }
    }
    scripts.sort((a: { updatedAt: number }, b: { updatedAt: number }) => b.updatedAt - a.updatedAt);
    return NextResponse.json(scripts);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/thewordtool → { folder, name, content, password? }
export async function POST(req: NextRequest) {
  try {
    await ensureDir(DATA_DIR);
    const { folder, name, content, password } = await req.json();

    if (!folder || !name || !content) {
      return NextResponse.json({ error: 'Missing folder, name, or content' }, { status: 400 });
    }

    const access = await verifyFolderAccess(folder, password);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 });

    const folderPath = path.join(DATA_DIR, sanitize(folder));
    await ensureDir(folderPath);

    const filePath = path.join(folderPath, `${sanitize(name)}.json`);
    const data = { name, content, updatedAt: Date.now() };
    await fs.writeFile(filePath, JSON.stringify(data));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}

// DELETE /api/thewordtool → { folder, name, password? }
export async function DELETE(req: NextRequest) {
  try {
    await ensureDir(DATA_DIR);
    const { folder, name, password } = await req.json();
    if (!folder || !name) return NextResponse.json({ error: 'Missing folder or name' }, { status: 400 });

    const access = await verifyFolderAccess(folder, password);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 });

    const filePath = path.join(DATA_DIR, sanitize(folder), `${sanitize(name)}.json`);
    try { await fs.unlink(filePath); } catch { /* already gone */ }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
