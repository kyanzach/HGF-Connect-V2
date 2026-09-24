// app/api/worship/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export interface SetlistSyncState {
  setlistId: string;
  songId: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  leaderId: string;
  leaderName: string;
  timestamp: number;
}

// In-memory cache keyed by setlistId for microsecond lookup
const globalSync = global as unknown as { __bandSyncStore?: Map<string, SetlistSyncState> };
if (!globalSync.__bandSyncStore) {
  globalSync.__bandSyncStore = new Map<string, SetlistSyncState>();
}
const syncStore = globalSync.__bandSyncStore;

const DATA_DIR = path.join(process.cwd(), 'data', 'worship');
const SYNC_FILE = path.join(DATA_DIR, 'live_sync.json');

// Helper to persist backup to disk non-blocking
async function persistBackup(state: SetlistSyncState) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    let existing: Record<string, SetlistSyncState> = {};
    try {
      const raw = await fs.readFile(SYNC_FILE, 'utf-8');
      existing = JSON.parse(raw);
    } catch (_) {}
    existing[state.setlistId] = state;
    await fs.writeFile(SYNC_FILE, JSON.stringify(existing), 'utf-8');
  } catch (_) {}
}

// GET /api/worship/sync?setlistId=xxx
export async function GET(req: NextRequest) {
  try {
    const setlistId = req.nextUrl.searchParams.get('setlistId');
    if (!setlistId) {
      return NextResponse.json({ error: 'setlistId is required' }, { status: 400 });
    }

    let state = syncStore.get(setlistId);

    // Fallback to disk if memory was cleared
    if (!state) {
      try {
        const raw = await fs.readFile(SYNC_FILE, 'utf-8');
        const diskData = JSON.parse(raw);
        if (diskData[setlistId]) {
          state = diskData[setlistId];
          if (state) syncStore.set(setlistId, state);
        }
      } catch (_) {}
    }

    if (!state) {
      return NextResponse.json({ ok: true, sync: null });
    }

    // Expire sync states older than 45 minutes of inactivity
    if (Date.now() - state.timestamp > 45 * 60 * 1000) {
      syncStore.delete(setlistId);
      return NextResponse.json({ ok: true, sync: null });
    }

    return NextResponse.json({ ok: true, sync: state });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sync error' }, { status: 500 });
  }
}

// POST /api/worship/sync
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { setlistId, songId, isPlaying, currentTime, duration, leaderId, leaderName } = body;

    if (!setlistId || !songId) {
      return NextResponse.json({ error: 'setlistId and songId are required' }, { status: 400 });
    }

    const state: SetlistSyncState = {
      setlistId: String(setlistId),
      songId: String(songId),
      isPlaying: Boolean(isPlaying),
      currentTime: Math.max(0, Number(currentTime) || 0),
      duration: Math.max(0, Number(duration) || 0),
      leaderId: String(leaderId || 'md'),
      leaderName: String(leaderName || 'MD'),
      timestamp: Date.now(),
    };

    syncStore.set(state.setlistId, state);

    // Non-blocking disk backup
    persistBackup(state);

    return NextResponse.json({ ok: true, sync: state });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sync update failed' }, { status: 500 });
  }
}
