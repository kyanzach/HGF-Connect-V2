import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data', 'worship');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export interface BandUser {
  id: string;
  username: string;
  password: string; // Stored for band portal management
  displayName: string;
  role: 'MD' | 'guitarist' | 'bassist' | 'keyboardist' | 'drummer' | 'vocalist' | 'sound' | 'admin' | 'leader' | 'backup_singer' | string;
  createdAt: number;
  updatedAt?: number;
}

const DEFAULT_USERS: BandUser[] = [
  {
    id: 'user-ryan',
    username: 'ryan',
    password: 'Godisgood',
    displayName: 'Ryan (Worship Leader / Admin)',
    role: 'admin',
    createdAt: Date.now(),
  },
  {
    id: 'user-karen',
    username: 'karen',
    password: 'Godisgood',
    displayName: 'Karen (Worship Leader)',
    role: 'leader',
    createdAt: Date.now(),
  },
  {
    id: 'user-vanneza',
    username: 'vanneza',
    password: 'Godisgood',
    displayName: 'Vanneza (Worship Leader)',
    role: 'leader',
    createdAt: Date.now(),
  },
  {
    id: 'user-darlene',
    username: 'darlene',
    password: 'Godisgood',
    displayName: 'Darlene (Worship Leader)',
    role: 'leader',
    createdAt: Date.now(),
  },
  {
    id: 'user-tanna',
    username: 'tanna',
    password: 'Godisgood',
    displayName: 'Tanna (Worship Leader)',
    role: 'leader',
    createdAt: Date.now(),
  },
  {
    id: 'user-andrea',
    username: 'andrea',
    password: 'Godisgood',
    displayName: 'Andrea (Backup Singer)',
    role: 'backup_singer',
    createdAt: Date.now(),
  },
  {
    id: 'user-debbie',
    username: 'debbie',
    password: 'Godisgood',
    displayName: 'Debbie (Backup Singer)',
    role: 'backup_singer',
    createdAt: Date.now(),
  },
  {
    id: 'user-hanna',
    username: 'hanna',
    password: 'Godisgood',
    displayName: 'Hanna (Backup Singer)',
    role: 'backup_singer',
    createdAt: Date.now(),
  },
  {
    id: 'user-ren',
    username: 'ren',
    password: 'Godisgood',
    displayName: 'Ren (MD)',
    role: 'MD',
    createdAt: Date.now(),
  },
  {
    id: 'user-la',
    username: 'la',
    password: 'Godisgood',
    displayName: 'LA (Drums)',
    role: 'drummer',
    createdAt: Date.now(),
  },
  {
    id: 'user-jl',
    username: 'jl',
    password: 'Godisgood',
    displayName: 'JL (Lead Guitar)',
    role: 'guitarist',
    createdAt: Date.now(),
  },
  {
    id: 'user-joven',
    username: 'joven',
    password: 'Godisgood',
    displayName: 'Joven (Bass)',
    role: 'bassist',
    createdAt: Date.now(),
  },
  {
    id: 'user-rabid',
    username: 'rabid',
    password: 'Godisgood',
    displayName: 'Rabid (Drums)',
    role: 'drummer',
    createdAt: Date.now(),
  },
  {
    id: 'user-ronnel',
    username: 'ronnel',
    password: 'Godisgood',
    displayName: 'Ronnel (Acoustic Guitar)',
    role: 'guitarist',
    createdAt: Date.now(),
  },
];

async function ensureUsersFile(): Promise<BandUser[]> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      let modified = false;
      // Ensure all official requested band members are in the file
      for (const def of DEFAULT_USERS) {
        const existing = parsed.find(
          (u) => u.username.toLowerCase() === def.username.toLowerCase()
        );
        if (!existing) {
          parsed.push({ ...def });
          modified = true;
        } else {
          // Normalize role / displayName if missing
          if (def.username === 'ryan' && existing.role !== 'admin') {
            existing.role = 'admin';
            modified = true;
          }
          if (def.username === 'ren' && existing.role !== 'MD') {
            existing.role = 'MD';
            modified = true;
          }
        }
      }
      if (modified) {
        await fs.writeFile(USERS_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      }
      return parsed;
    }
  } catch {}

  // Initialize with defaults if empty
  await fs.writeFile(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
  return DEFAULT_USERS;
}

// GET /api/worship/users -> List all users (with password visibility for band admin)
export async function GET() {
  try {
    const users = await ensureUsersFile();
    const safeUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName || u.username,
      role: u.role || 'guitarist',
      password: u.password || 'Godisgood',
      createdAt: u.createdAt,
    }));
    return NextResponse.json({ ok: true, users: safeUsers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/worship/users -> Login, Create, Update, UpdatePassword, Delete, DeleteAll
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

      // Allow 'ryan' or 'admin' for primary admin
      const match = users.find(
        (u) =>
          (u.username.toLowerCase() === username || (username === 'admin' && u.username.toLowerCase() === 'ryan') || (username === 'ryan' && u.username.toLowerCase() === 'admin')) &&
          (u.password === password ||
            (password.toLowerCase() === 'godisgood' && (u.password === 'Godisgood' || u.password === 'password')) ||
            (password.toLowerCase() === 'password' && u.password === 'Godisgood'))
      );

      if (!match) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }

      const safeUser = {
        id: match.id,
        username: match.username,
        displayName: match.displayName || match.username,
        role: match.role,
      };

      const res = NextResponse.json({
        ok: true,
        user: safeUser,
      });

      // 10-year persistent cookie for permanent login per device
      res.cookies.set('hgf_band_user', encodeURIComponent(JSON.stringify(safeUser)), {
        path: '/',
        maxAge: 365 * 24 * 60 * 60 * 10,
        sameSite: 'lax',
      });

      return res;
    }

    // 1b. LOGOUT
    if (action === 'logout') {
      const res = NextResponse.json({ ok: true });
      res.cookies.set('hgf_band_user', '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
      });
      return res;
    }

    // 2. CREATE USER
    if (action === 'create') {
      const rawUsername = (body.username || '').trim();
      const username = rawUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '');
      const password = (body.password || '').trim() || 'Godisgood';
      const displayName = (body.displayName || rawUsername).trim();
      const role = body.role || 'guitarist';

      if (!username) {
        return NextResponse.json({ error: 'Valid username is required' }, { status: 400 });
      }

      if (users.some((u) => u.username.toLowerCase() === username)) {
        return NextResponse.json({ error: `Username "@${username}" is already taken` }, { status: 409 });
      }

      const newUser: BandUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username,
        password,
        displayName: displayName || username,
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
          password: newUser.password,
        },
      });
    }

    // 3. CHANGE / UPDATE PASSWORD
    if (action === 'changePassword' || action === 'updatePassword') {
      const id = body.id;
      const username = (body.username || '').trim().toLowerCase();
      const newPassword = (body.newPassword || body.password || '').trim();

      if (!newPassword) {
        return NextResponse.json({ error: 'New password cannot be empty' }, { status: 400 });
      }

      const idx = users.findIndex((u) => (id && u.id === id) || (username && u.username.toLowerCase() === username));
      if (idx === -1) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      users[idx].password = newPassword;
      users[idx].updatedAt = Date.now();
      await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

      return NextResponse.json({
        ok: true,
        message: `Password updated for @${users[idx].username}`,
        user: {
          id: users[idx].id,
          username: users[idx].username,
          displayName: users[idx].displayName,
          role: users[idx].role,
        },
      });
    }

    // 4. UPDATE USER
    if (action === 'update') {
      const id = body.id;
      if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      if (body.username) {
        const cleanUser = body.username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
        if (cleanUser && cleanUser !== users[idx].username.toLowerCase()) {
          if (users.some((u, i) => i !== idx && u.username.toLowerCase() === cleanUser)) {
            return NextResponse.json({ error: 'Username already in use' }, { status: 409 });
          }
          users[idx].username = cleanUser;
        }
      }

      if (body.displayName) users[idx].displayName = body.displayName.trim();
      if (body.role) users[idx].role = body.role;
      if (body.password && body.password.trim()) users[idx].password = body.password.trim();
      users[idx].updatedAt = Date.now();

      await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
      return NextResponse.json({ ok: true, user: users[idx] });
    }

    // 5. DELETE USER
    if (action === 'delete') {
      const id = body.id || body.userId;
      if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

      const target = users.find((u) => u.id === id || u.username.toLowerCase() === id.toLowerCase());
      if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      if (target.username === 'ryan' || (target.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1)) {
        return NextResponse.json({ error: 'Primary admin account (@ryan) cannot be deleted' }, { status: 403 });
      }

      const filtered = users.filter((u) => u.id !== target.id);
      await fs.writeFile(USERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      return NextResponse.json({ ok: true, message: `User @${target.username} deleted` });
    }

    // 6. DELETE ALL (Remove all non-admin members)
    if (action === 'deleteAll') {
      const kept = users.filter((u) => u.role === 'admin' || u.username === 'ryan');
      if (kept.length === 0) {
        kept.push({
          id: 'user-admin',
          username: 'ryan',
          password: 'Godisgood',
          displayName: 'Ryan (Admin)',
          role: 'admin',
          createdAt: Date.now(),
        });
      }
      await fs.writeFile(USERS_FILE, JSON.stringify(kept, null, 2), 'utf-8');
      return NextResponse.json({ ok: true, message: 'All members removed except admin', count: kept.length });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}

// DELETE /api/worship/users?id=... OR ?all=true
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all') === 'true';
    const users = await ensureUsersFile();

    if (all) {
      const kept = users.filter((u) => u.role === 'admin' || u.username === 'ryan');
      if (kept.length === 0) {
        kept.push({
          id: 'user-admin',
          username: 'ryan',
          password: 'Godisgood',
          displayName: 'Ryan (Admin)',
          role: 'admin',
          createdAt: Date.now(),
        });
      }
      await fs.writeFile(USERS_FILE, JSON.stringify(kept, null, 2), 'utf-8');
      return NextResponse.json({ ok: true, message: 'All members removed except admin', count: kept.length });
    }

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const target = users.find((u) => u.id === id || u.username.toLowerCase() === id.toLowerCase());
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (target.username === 'ryan' || (target.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1)) {
      return NextResponse.json({ error: 'Primary admin account (@ryan) cannot be deleted' }, { status: 403 });
    }

    const filtered = users.filter((u) => u.id !== target.id);
    await fs.writeFile(USERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return NextResponse.json({ ok: true, message: `User @${target.username} deleted` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Deletion failed' }, { status: 500 });
  }
}
