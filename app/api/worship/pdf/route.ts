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

interface PdfItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

function formatLineItems(items: PdfItem[], minX: number): string {
  items.sort((a, b) => a.x - b.x);
  let lineStr = '';
  let cursorX = 0;
  const charWidth = 6.2;

  for (const it of items) {
    const relX = Math.max(0, it.x - minX);
    const targetCol = Math.max(0, Math.round(relX / charWidth));

    if (targetCol > cursorX) {
      lineStr += ' '.repeat(targetCol - cursorX);
      cursorX = targetCol;
    } else if (lineStr.length > 0 && !lineStr.endsWith(' ')) {
      lineStr += ' ';
      cursorX++;
    }
    lineStr += it.str;
    cursorX += it.str.length;
  }
  return lineStr;
}

function processColumnItems(items: PdfItem[]): string[] {
  if (items.length === 0) return [];
  items.sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 3.2) return yDiff;
    return a.x - b.x;
  });

  const lines: { y: number; items: PdfItem[] }[] = [];
  let curLine: { y: number; items: PdfItem[] } | null = null;

  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    if (curLine === null || Math.abs(it.y - curLine.y) <= 3.2) {
      if (curLine === null) {
        curLine = { y: it.y, items: [] };
        lines.push(curLine);
      }
      curLine.items.push(it);
    } else {
      curLine = { y: it.y, items: [it] };
      lines.push(curLine);
    }
  }

  const minX = Math.min(...items.map((it) => it.x));
  const result: string[] = [];
  for (const line of lines) {
    const str = formatLineItems(line.items, minX);
    if (/^\s*\d+\s*$/.test(str)) continue;
    result.push(str);
  }
  return result;
}

// Coordinate-aware page renderer that maintains precise horizontal chord-over-lyric column positions
// and seamlessly supports SongbookPro 2-column or 1-column layouts
function createPagerender(metaRef: {
  detectedTitle: string;
  detectedArtist: string;
  detectedKey: string;
  detectedBpm: number | null;
}) {
  return function render_page(pageData: any) {
    return pageData
      .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
      .then(function (textContent: any) {
        const pageNum = pageData.pageIndex + 1;
        const rawItems = (textContent.items || []).filter((it: any) => it && it.str && it.str.trim());
        const items: PdfItem[] = rawItems.map((it: any) => ({
          str: it.str,
          x: it.transform[4],
          y: it.transform[5],
          width: it.width || it.str.length * 6.2,
        }));

        // 1. Scan grouped lines across the page for Key and BPM if not yet detected
        const yGroups: Record<number, { str: string; x: number }[]> = {};
        for (const it of items) {
          const yKey = Math.round(it.y / 3.5) * 3.5;
          if (!yGroups[yKey]) yGroups[yKey] = [];
          yGroups[yKey].push(it);
        }

        for (const y in yGroups) {
          const lineText = yGroups[y]
            .sort((a, b) => a.x - b.x)
            .map((it) => it.str)
            .join(' ');
          const keyM = lineText.match(/\bKey:\s*([A-G][b#]?(?:m|maj|min)?)\b/i);
          if (keyM && !metaRef.detectedKey) metaRef.detectedKey = keyM[1].toUpperCase();

          const bpmM = lineText.match(/\b(\d{2,3})\s*BPM\b/i);
          if (bpmM && !metaRef.detectedBpm) metaRef.detectedBpm = parseInt(bpmM[1], 10);
        }

        // 2. Header extraction on Page 1 (Title and Artist)
        if (pageNum === 1) {
          const headerItems = items.filter((it: PdfItem) => it.y >= 740);
          headerItems.sort((a: PdfItem, b: PdfItem) => {
            const yDiff = b.y - a.y;
            if (Math.abs(yDiff) > 3) return yDiff;
            return a.x - b.x;
          });

          const hLines: { y: number; items: PdfItem[] }[] = [];
          let curH: { y: number; items: PdfItem[] } | null = null;
          for (const it of headerItems) {
            if (curH === null || Math.abs(it.y - curH.y) <= 3) {
              if (curH === null) {
                curH = { y: it.y, items: [] };
                hLines.push(curH);
              }
              curH.items.push(it);
            } else {
              curH = { y: it.y, items: [it] };
              hLines.push(curH);
            }
          }

          for (const line of hLines) {
            const leftItems = line.items.filter((it: PdfItem) => it.x < 300);
            if (leftItems.length > 0) {
              const leftText = leftItems
                .map((it: PdfItem) => it.str)
                .join(' ')
                .replace(/\bKey:.*$/i, '')
                .trim();
              if (leftText && !/^\d+$/.test(leftText) && !/\bBPM\b/i.test(leftText) && !/^Key:/i.test(leftText)) {
                if (!metaRef.detectedTitle) {
                  metaRef.detectedTitle = leftText;
                } else if (!metaRef.detectedArtist) {
                  metaRef.detectedArtist = leftText;
                }
              }
            }
          }
        }

        // 3. Filter content items: exclude page footer (page numbers) and page 1 header items
        const contentItems = items.filter((it: any) => {
          if (it.y < 35 && /^\d+$/.test(it.str.trim())) return false;
          if (pageNum === 1 && it.y >= 745) return false;
          return true;
        });

        // 4. Multi-column detection:
        // SongbookPro 2-column format: Column 1 is X < 285. Column 2 is X >= 285.
        // A true 2-column page has substantial independent content in both halves.
        const col1Items = contentItems.filter((it: any) => it.x < 285);
        const col2Items = contentItems.filter((it: any) => it.x >= 285);
        const isTwoColumn = col1Items.length >= 10 && col2Items.length >= 15;

        if (isTwoColumn) {
          const col1Lines = processColumnItems(col1Items);
          const col2Lines = processColumnItems(col2Items);
          return [...col1Lines, ...col2Lines].join('\n');
        } else {
          const singleLines = processColumnItems(contentItems);
          return singleLines.join('\n');
        }
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
      const metaRef = {
        detectedTitle: '',
        detectedArtist: '',
        detectedKey: '',
        detectedBpm: null as number | null,
      };

      const pdfData = await pdfParse(buffer, {
        pagerender: createPagerender(metaRef),
      });

      const rawText = pdfData.text || '';
      const lines = rawText.split('\n');

      // Clean filename for fallback: e.g. "1-Faith.pdf" -> "Faith"
      let cleanFileName = file.name
        .replace(/\.pdf$/i, '')
        .replace(/^\d+[\s\-_.]*/, '')
        .trim();

      // If filename had "Chords by Artist", e.g. "Oceans Where Feet May Fail Chords by Hillsong United"
      const chordsByMatch = cleanFileName.match(/^(.*?)\s+Chords\s+by\s+(.*)$/i);
      if (chordsByMatch) {
        if (!metaRef.detectedTitle || metaRef.detectedTitle.includes('Chords by')) {
          metaRef.detectedTitle = chordsByMatch[1].trim();
        }
        if (!metaRef.detectedArtist) {
          metaRef.detectedArtist = chordsByMatch[2].trim();
        }
      }

      if (metaRef.detectedTitle && /Chords\s+by/i.test(metaRef.detectedTitle)) {
        const m = metaRef.detectedTitle.match(/^(.*?)\s+Chords\s+by\s+(.*)$/i);
        if (m) {
          metaRef.detectedTitle = m[1].trim();
          if (!metaRef.detectedArtist) metaRef.detectedArtist = m[2].trim();
        }
      }

      // Filter out redundant Key or BPM lines from top of body lines if already extracted
      const bodyLines: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (i < 5 && (/^Key:\s*[A-G][b#]?/i.test(trimmed) || /^\d+\s*BPM$/i.test(trimmed))) {
          continue;
        }
        bodyLines.push(lines[i]);
      }

      const finalTitle = metaRef.detectedTitle || cleanFileName || 'Untitled Song';
      const finalArtist = metaRef.detectedArtist || 'House of Grace';
      const finalKey = metaRef.detectedKey || 'C';
      const finalChords = bodyLines.join('\n').trim();

      const songId = sanitize(`${finalTitle}-${finalArtist}`.toLowerCase().replace(/\s+/g, '-'));

      const songObj: ParsedPdfSong = {
        id: songId,
        title: finalTitle,
        artist: finalArtist,
        key: finalKey,
        tempo: metaRef.detectedBpm,
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
          tempo: metaRef.detectedBpm || null,
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
              chords: s.chords,
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
