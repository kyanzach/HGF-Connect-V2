import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'uploads', 'audio');
const DATA_DIR = path.join(process.cwd(), 'data', 'worship');
const SONGS_DIR = path.join(DATA_DIR, 'songs');

// 1.0 GB (1024 MB) Server Buffer Limit
const BUFFER_QUOTA_BYTES = 1024 * 1024 * 1024;

async function ensureDirs() {
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  await fs.mkdir(SONGS_DIR, { recursive: true });
}

async function getStorageMetrics() {
  await ensureDirs();
  try {
    const files = await fs.readdir(AUDIO_DIR);
    let totalBytes = 0;
    const list = [];

    for (const f of files) {
      if (f.startsWith('.')) continue;
      try {
        const filePath = path.join(AUDIO_DIR, f);
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          // Clean up and ignore 0-byte/empty audio files
          if (stat.size === 0) {
            try { await fs.unlink(filePath); } catch {}
            continue;
          }
          totalBytes += stat.size;
          list.push({
            filename: f,
            url: `/uploads/audio/${encodeURIComponent(f)}`,
            size: stat.size,
            sizeMb: (stat.size / (1024 * 1024)).toFixed(1),
            updatedAt: stat.mtimeMs,
          });
        }
      } catch {}
    }

    list.sort((a, b) => b.updatedAt - a.updatedAt);

    const percent = Math.min(100, Math.round((totalBytes / BUFFER_QUOTA_BYTES) * 100));
    return {
      usedBytes: totalBytes,
      quotaBytes: BUFFER_QUOTA_BYTES,
      usedMb: (totalBytes / (1024 * 1024)).toFixed(1),
      quotaMb: 1024,
      percent,
      fileCount: list.length,
      files: list,
    };
  } catch {
    return {
      usedBytes: 0,
      quotaBytes: BUFFER_QUOTA_BYTES,
      usedMb: '0.0',
      quotaMb: 1024,
      percent: 0,
      fileCount: 0,
      files: [],
    };
  }
}

// GET /api/worship/audio -> returns storage stats and list of backing tracks
export async function GET() {
  try {
    const metrics = await getStorageMetrics();
    return NextResponse.json(metrics);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read audio storage' }, { status: 500 });
  }
}

// POST /api/worship/audio -> uploads audio file (.mp3, .wav, .m4a, .aac)
export async function POST(req: NextRequest) {
  try {
    await ensureDirs();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const songId = (formData.get('songId') as string | null) || '';

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Audio file is empty (0 MB)' }, { status: 400 });
    }

    // Validate mime / extension
    const ext = path.extname(file.name).toLowerCase();
    const allowed = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: 'Unsupported audio format. Please upload MP3, WAV, or M4A.' }, { status: 400 });
    }

    const fileSize = file.size;
    const metrics = await getStorageMetrics();

    if (metrics.usedBytes + fileSize > BUFFER_QUOTA_BYTES) {
      return NextResponse.json(
        {
          error: `Storage buffer limit reached (1.0 GB). Used: ${metrics.usedMb} MB. Please delete old audio files to free up space.`,
        },
        { status: 413 }
      );
    }

    // Clean filename: [timestamp]_[cleanedOriginalName]
    const baseName = path.basename(file.name, ext).replace(/[^\w\s-]/g, '_').slice(0, 50).trim();
    const finalName = `${Date.now()}_${baseName}${ext}`;
    const destination = path.join(AUDIO_DIR, finalName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(destination, buffer);

    const fileUrl = `/uploads/audio/${finalName}`;
    const audioTrackInfo = {
      filename: finalName,
      originalName: file.name,
      url: fileUrl,
      size: fileSize,
      sizeMb: (fileSize / (1024 * 1024)).toFixed(1),
      uploadedAt: Date.now(),
      songId: songId || null,
    };

    let attachedSong: any = null;
    // If songId provided, attach audioTrack metadata directly to song json
    if (songId) {
      try {
        const cleanSongId = songId.replace(/[^\w\s\-().]/g, '_').trim();
        const songPath = path.join(SONGS_DIR, `${cleanSongId}.json`);
        const songRaw = await fs.readFile(songPath, 'utf-8');
        const songData = JSON.parse(songRaw);
        songData.audioTrack = audioTrackInfo;
        songData.useBacktrack = true;
        songData.updatedAt = Date.now();
        await fs.writeFile(songPath, JSON.stringify(songData, null, 2), 'utf-8');
        attachedSong = songData;
      } catch (e) {
        console.warn('Could not attach audio track to song JSON:', e);
      }
    }

    const updatedMetrics = await getStorageMetrics();

    return NextResponse.json({
      ok: true,
      audioTrack: audioTrackInfo,
      metrics: updatedMetrics,
      attachedSong,
      attachedSongId: songId || null,
    });
  } catch (err: any) {
    console.error('Audio upload error:', err);
    return NextResponse.json({ error: err.message || 'Audio upload failed' }, { status: 500 });
  }
}

// DELETE /api/worship/audio?filename=xxx&songId=yyy -> delete audio file
export async function DELETE(req: NextRequest) {
  try {
    const filename = req.nextUrl.searchParams.get('filename');
    const songId = req.nextUrl.searchParams.get('songId');

    if (!filename) {
      return NextResponse.json({ error: 'Filename parameter is required' }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const targetPath = path.join(AUDIO_DIR, safeFilename);

    try {
      await fs.unlink(targetPath);
    } catch {}

    // Unlink from song if songId provided
    if (songId) {
      try {
        const cleanSongId = songId.replace(/[^\w\s\-().]/g, '_').trim();
        const songPath = path.join(SONGS_DIR, `${cleanSongId}.json`);
        const songRaw = await fs.readFile(songPath, 'utf-8');
        const songData = JSON.parse(songRaw);
        if (songData.audioTrack && songData.audioTrack.filename === safeFilename) {
          delete songData.audioTrack;
          songData.updatedAt = Date.now();
          await fs.writeFile(songPath, JSON.stringify(songData, null, 2), 'utf-8');
        }
      } catch {}
    }

    const updatedMetrics = await getStorageMetrics();
    return NextResponse.json({ ok: true, metrics: updatedMetrics });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Audio delete failed' }, { status: 500 });
  }
}
