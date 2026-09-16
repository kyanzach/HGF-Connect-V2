import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data', 'worship');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export interface BandUser {
  id: string;
  username: string;
  password: string; // Basic password as requested
  displayName: string;
  role: 'MD' | 'guitarist' | 'bassist' | 'keyboardist' | 'drummer' | 'vocalist' | 'sound' | 'admin';
  createdAt: number;
  updatedAt?: number;
}

const DEFAULT_USERS: BandUser[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'Godisgood',
    displayName: 'Worship Admin',
    role: 'admin',
    createdAt: Date.now(),
  },
  {
    id: 'user-md',
    username: 'md',
    password: 'Godisgood',
    displayName: 'Musical Director',
    role: 'MD',
    createdAt: Date.now(),
  },
  {
    id: 'user-guitar',
    username: 'guitar',
    password: 'Godisgood',
    displayName: 'Guitarist',
    role: 'guitarist',
    createdAt: Date.now(),
  },
  {
    id: 'user-bass',
    username: 'bass',
    password: 'Godisgood',
    displayName: 'Bassist',
    role: 'bassist',
    createdAt: Date.now(),
  },
  {
    id: 'user-keys',
    username: 'keys',
    password: 'Godisgood',
    displayName: 'Keyboardist',
    role: 'keyboardist',
    createdAt: Date.now(),
  },
  {
    id: 'user-drums',
    username: 'drums',
    password: 'Godisgood',
    displayName: 'Drummer',
    role: 'drummer',
    createdAt: Date.now(),
  },
  {
    id: 'user-vocals',
    username: 'vocals',
    password: 'Godisgood',
    displayName: 'Vocalist',
    role: 'vocalist',
    createdAt: Date.now(),
  },
];

async function ensureUsersFile(): Promise<BandUser[]> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {}

  // Initialize with defaults if empty
  await fs.writeFile(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
  return DEFAULT_USERS;
}

// GET /api/worship/users -> List all users (safe profile info)
export async function GET() {
  try {
    const users = await ensureUsersFile();
    const safeUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName || u.username,
      role: u.role || 'guitarist',
      createdAt: u.createdAt,
    }));
    return NextResponse.json({ ok: true, users: safeUsers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/worship/users -> Login, Create, Update, Delete
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'login';
    const users = await ensureUsersFile();

    // 1. LOGIN
    if (action === 'login') {
      const username = (body.username || '').trim().toLowerCase();
      const password = (body.password || '').trim();

      if (!username || !password) {
        return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
      }

      const match = users.find(
        (u) =>
          u.username.toLowerCase() === username &&
          (u.password === password ||
            (password.toLowerCase() === 'godisgood' && (u.password === 'Godisgood' || u.password === 'password')) ||
            (password.toLowerCase() === 'password' && u.password === 'Godisgood'))
      );

      if (!match) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }

      return NextResponse.json({
        ok: true,
        user: {
          id: match.id,
          username: match.username,
          displayName: match.displayName || match.username,
          role: match.role,
        },
      });
    }

    // 2. CREATE USER
    if (action === 'create') {
      const username = (body.username || '').trim().toLowerCase().replace(/[^\w.-]/g, '');
      const password = (body.password || '').trim() || 'Godisgood';
      const displayName = (body.displayName || username).trim();
      const role = body.role || 'guitarist';

      if (!username) {
        return NextResponse.json({ error: 'Username is required' }, { status: 400 });
      }

      if (users.some((u) => u.username.toLowerCase() === username)) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
      }

      const newUser: BandUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username,
        password,
        displayName,
        role,
        createdAt: Date.now(),
      };

      users.push(newUser);
      await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

      return NextResponse.json({
        ok: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          displayName: newUser.displayName,
          role: newUser.role,
        },
      });
    }

    // 3. UPDATE USER
    if (action === 'update') {
      const id = body.id;
      if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      if (body.displayName) users[idx].displayName = body.displayName.trim();
      if (body.role) users[idx].role = body.role;
      if (body.password && body.password.trim()) users[idx].password = body.password.trim();
      users[idx].updatedAt = Date.now();

      await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
      return NextResponse.json({ ok: true, user: users[idx] });
    }

    // 4. DELETE USER
    if (action === 'delete') {
      const id = body.id;
      if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

      if (id === 'user-admin') {
        return NextResponse.json({ error: 'Primary administrator account cannot be deleted' }, { status: 403 });
      }

      const filtered = users.filter((u) => u.id !== id);
      await fs.writeFile(USERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      return NextResponse.json({ ok: true, message: 'User deleted' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
