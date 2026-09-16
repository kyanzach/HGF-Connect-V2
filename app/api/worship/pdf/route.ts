import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
// @ts-ignore
import pdfParse from 'pdf-parse';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data', 'worship');
const SONGS_DIR = path.join(DATA_DIR, 'songs');
const SETLISTS_DIR = path.join(DATA_DIR, 'setlists');

function sanitize(name: string): string {
  return name.replace(/[^\w\s\-().]/g, '_').substring(0, 120).trim();
}

async function ensureDirs() {
  await fs.mkdir(SONGS_DIR, { recursive: true });
  await fs.mkdir(SETLISTS_DIR, { recursive: true });
}

interface ParsedPdfSong {
  id: string;
  title: string;
  artist: string;
  key: string;
  tempo?: number | null;
  chords: string;
  chordFormat: string;
  sourceFilename: string;
}

// Coordinate-aware page renderer that maintains precise horizontal chord-over-lyric column positions
function createPagerender() {
  return function render_page(pageData: any) {
    return pageData
      .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
      .then(function (textContent: any) {
        const lines: { y: number; items: { x: number; str: string; width: number }[] }[] = [];
        let currentLine: { y: number; items: { x: number; str: string; width: number }[] } | null = null;

        const items = (textContent.items || []).filter((it: any) => it && it.str && it.str.trim());

        // Sort items: top-to-bottom (Y desc), left-to-right (X asc)
        items.sort((a: any, b: any) => {
          const yDiff = b.transform[5] - a.transform[5];
          if (Math.abs(yDiff) > 3) return yDiff;
          return a.transform[4] - b.transform[4];
        });

        // Find minimum X coordinate to eliminate page margin offset
        let minX = 9999;
        for (const it of items) {
          if (it.transform[4] < minX) minX = it.transform[4];
        }
        if (minX === 9999) minX = 0;

        for (const item of items) {
          const y = item.transform[5];
          const x = item.transform[4];
          if (!currentLine || Math.abs(currentLine.y - y) > 3) {
            currentLine = { y, items: [] };
            lines.push(currentLine);
          }
          currentLine.items.push({ x, str: item.str, width: item.width || item.str.length * 6.2 });
        }

        const formattedLines: string[] = [];
        for (const line of lines) {
          let lineStr = '';
          let lastX = minX;
          for (const it of line.items) {
            const charSpacing = Math.max(lineStr === '' ? 0 : 1, Math.round((it.x - lastX) / 6.2));
            lineStr += ' '.repeat(charSpacing) + it.str;
            lastX = it.x + (it.width || it.str.length * 6.2);
          }
          // Filter out isolated standalone page numbers (e.g. "1", "2", "3")
          if (/^\s*\d+\s*$/.test(lineStr)) continue;
          formattedLines.push(lineStr);
        }

        return formattedLines.join('\n');
      });
  };
}

export async function POST(req: NextRequest) {
  try {
    await ensureDirs();

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    const formData = await req.formData();
    const autoSave = formData.get('save') === 'true' || formData.get('save') === '1';
    const targetSetlistId = formData.get('setlistId')?.toString() || '';

    const files: File[] = [];
    for (const [key, val] of formData.entries()) {
      if (val instanceof File && (val.name.endsWith('.pdf') || val.type === 'application/pdf')) {
        files.push(val);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No PDF files found in request' }, { status: 400 });
    }

    const parsedSongs: ParsedPdfSong[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await pdfParse(buffer, {
        pagerender: createPagerender(),
      });

      const rawText = pdfData.text || '';
      const lines = rawText.split('\n');

      // Metadata extraction
      let detectedKey = '';
      let detectedBpm: number | null = null;
      let detectedTitle = '';
      let detectedArtist = '';

      // Clean filename for fallback title: e.g. "2-God Is Here.pdf" -> "God Is Here"
      const cleanFileName = file.name
        .replace(/\.pdf$/i, '')
        .replace(/^\d+[\s\-_.]*/, '')
        .trim();

      const bodyLines: string[] = [];
      let headerPhase = true;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          if (!headerPhase) bodyLines.push(line);
          continue;
        }

        // Look for Key declaration: e.g. "Key: D" or "Key: G"
        const keyMatch = trimmed.match(/\bKey:\s*([A-G][b#]?(?:m|maj|min)?)\b/i);
        if (keyMatch) {
          detectedKey = keyMatch[1].toUpperCase();
          // If the line only contains the key, don't include in song body
          if (trimmed.replace(keyMatch[0], '').trim().length === 0) {
            continue;
          }
        }

        // Look for BPM declaration: e.g. "65 BPM"
        const bpmMatch = trimmed.match(/\b(\d{2,3})\s*BPM\b/i);
        if (bpmMatch) {
          detectedBpm = parseInt(bpmMatch[1], 10);
          if (trimmed.replace(bpmMatch[0], '').trim().length === 0) {
            continue;
          }
        }

        // Check if header phase
        if (headerPhase) {
          // If it starts with common section markers, header phase is done
          if (/^(intro|verse|chorus|bridge|interlude|instrumental|pre-chorus|ending|outro|hold)\b/i.test(trimmed)) {
            headerPhase = false;
            bodyLines.push(line);
            continue;
          }

          // First header text line -> Title
          if (!detectedTitle) {
            // Remove trailing "Key: X" if attached
            let cleanTitle = trimmed;
            if (keyMatch) cleanTitle = cleanTitle.replace(keyMatch[0], '').trim();
            if (cleanTitle) {
              detectedTitle = cleanTitle;
              continue;
            }
          } else if (!detectedArtist) {
            // Second header text line -> Artist
            let cleanArtist = trimmed;
            if (keyMatch) cleanArtist = cleanArtist.replace(keyMatch[0], '').trim();
            if (cleanArtist) {
              detectedArtist = cleanArtist;
              continue;
            }
          }
        }

        bodyLines.push(line);
      }

      const finalTitle = detectedTitle || cleanFileName || 'Untitled Song';
      const finalArtist = detectedArtist || 'House of Grace';
      const finalKey = detectedKey || 'C';
      const finalChords = bodyLines.join('\n').trim();

      const songId = sanitize(`${finalTitle}-${finalArtist}`.toLowerCase().replace(/\s+/g, '-'));

      const songObj: ParsedPdfSong = {
        id: songId,
        title: finalTitle,
        artist: finalArtist,
        key: finalKey,
        tempo: detectedBpm,
        chords: finalChords,
        chordFormat: 'chords_over_lyrics',
        sourceFilename: file.name,
      };

      parsedSongs.push(songObj);

      // Auto-save to library if requested
      if (autoSave) {
        const fullSongData = {
          id: songId,
          title: finalTitle,
          alternativeTitle: '',
          artist: finalArtist,
          key: finalKey,
          originalKey: finalKey,
          chords: finalChords,
          chordFormat: 'chords_over_lyrics',
          capo: '0',
          tempo: detectedBpm || null,
          timeSignature: '4/4',
          duration: '',
          sectionOrder: '',
          songNumber: '',
          copyright: '',
          webUrl: '',
          notes: `Imported from SongbookPro PDF (${file.name})`,
          exhortation: '',
          updatedAt: Date.now(),
        };

        const songPath = path.join(SONGS_DIR, `${songId}.json`);
        await fs.writeFile(songPath, JSON.stringify(fullSongData, null, 2), 'utf-8');
      }
    }

    // Attach to target setlist if requested
    if (autoSave && targetSetlistId && parsedSongs.length > 0) {
      const setlistFile = path.join(SETLISTS_DIR, `${sanitize(targetSetlistId)}.json`);
      try {
        const setlistRaw = await fs.readFile(setlistFile, 'utf-8');
        const setlistData = JSON.parse(setlistRaw);
        if (!Array.isArray(setlistData.songs)) setlistData.songs = [];

        for (const s of parsedSongs) {
          // Avoid duplicate additions
          const exists = setlistData.songs.some((item: any) => {
            const id = typeof item === 'string' ? item : item.id;
            return id === s.id;
          });
          if (!exists) {
            setlistData.songs.push({
              id: s.id,
              title: s.title,
              artist: s.artist,
              key: s.key,
              tempo: s.tempo || 73,
            });
          }
        }
        setlistData.updatedAt = Date.now();
        await fs.writeFile(setlistFile, JSON.stringify(setlistData, null, 2), 'utf-8');
      } catch (e) {
        console.error('Failed to update setlist with imported songs:', e);
      }
    }

    return NextResponse.json({
      ok: true,
      count: parsedSongs.length,
      songs: parsedSongs,
      autoSaved: autoSave,
      targetSetlistId: targetSetlistId || null,
    });
  } catch (err: any) {
    console.error('PDF Import API error:', err);
    return NextResponse.json({ error: err.message || 'PDF parse failed' }, { status: 500 });
  }
}
