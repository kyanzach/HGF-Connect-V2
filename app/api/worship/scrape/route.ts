import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function parseUgContent(rawContent: string, stripChords = true, songName = '', artistName = ''): string {
  let text = decodeHtmlEntities(rawContent);
  text = text.replace(/\[\/?tab\]/gi, '');

  if (stripChords) {
    const lines = text.split('\n');
    const cleanedLines: string[] = [];
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const withoutCh = line.replace(/\[ch\].*?\[\/ch\]/gi, '').trim();
      const isHeader = /^\[(Intro|Verse|Chorus|Pre-Chorus|Bridge|Vamp|Tag|Interlude|Outro|Ending|Instrumental|Refrain).*?\]/i.test(line);

      if (isHeader) {
        cleanedLines.push(line);
      } else if (withoutCh === '' && /\[ch\]/i.test(line)) {
        // Chord-only line
        continue;
      } else {
        // Line has words + chords
        const clean = line.replace(/\[ch\].*?\[\/ch\]/gi, '').trim();
        if (clean || (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] !== '')) {
          cleanedLines.push(clean);
        }
      }
    }
    text = cleanedLines.join('\n');
  } else {
    // Retain clean bracketed chords like [G]
    text = text.replace(/\[ch\](.*?)\[\/ch\]/gi, '[$1]');
  }

  // Remove leading title/artist duplicates before the first section header
  if (songName || artistName) {
    const lines = text.split('\n');
    let startIdx = 0;
    while (startIdx < lines.length && startIdx < 4) {
      const l = lines[startIdx].trim().toLowerCase();
      if (!l) {
        startIdx++;
        continue;
      }
      if (l.startsWith('[')) break;
      if (
        (songName && l === songName.toLowerCase()) ||
        (artistName && l === artistName.toLowerCase()) ||
        (songName && artistName && l === `${songName.toLowerCase()} - ${artistName.toLowerCase()}`) ||
        (songName && artistName && l === `${artistName.toLowerCase()} - ${songName.toLowerCase()}`)
      ) {
        startIdx++;
      } else {
        break;
      }
    }
    text = lines.slice(startIdx).join('\n');
  }

  // Remove URLs or video references
  text = text.replace(/https?:\/\/\S+/gi, '').trim();

  // Normalize duplicate blank lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

// POST /api/worship/scrape
// Body: { action: 'search', query: string } OR { action: 'fetch', url: string, stripChords?: boolean }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, query, url, stripChords = true } = body;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };

    if (action === 'search') {
      if (!query || typeof query !== 'string') {
        return NextResponse.json({ error: 'Search query required' }, { status: 400 });
      }

      const searchUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(query.trim())}`;
      const res = await fetch(searchUrl, { headers, cache: 'no-store' });
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to reach search provider' }, { status: 502 });
      }

      const html = await res.text();
      const match = html.match(/class="js-store"\s+data-content="([^"]+)"/);
      if (!match) {
        return NextResponse.json({ results: [] });
      }

      const decoded = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
      const rawResults = decoded?.store?.page?.data?.results || [];

      // Filter for Chords or Tabs with song names
      const results = rawResults
        .filter((r: any) => r.tab_url && r.song_name && (r.type === 'Chords' || r.type === 'Pro' || r.type === 'Tabs'))
        .slice(0, 15)
        .map((r: any) => ({
          id: r.id,
          song_name: decodeHtmlEntities(r.song_name || ''),
          artist_name: decodeHtmlEntities(r.artist_name || ''),
          type: r.type,
          rating: r.rating ? Number(r.rating).toFixed(1) : null,
          votes: r.votes || 0,
          tab_url: r.tab_url,
          tonality_name: r.tonality_name || '',
          version: r.version || 1,
        }));

      return NextResponse.json({ results });
    }

    if (action === 'fetch') {
      if (!url || typeof url !== 'string') {
        return NextResponse.json({ error: 'Tab URL required' }, { status: 400 });
      }

      const res = await fetch(url, { headers, cache: 'no-store' });
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch tab details' }, { status: 502 });
      }

      const html = await res.text();
      const match = html.match(/class="js-store"\s+data-content="([^"]+)"/);
      if (!match) {
        return NextResponse.json({ error: 'Song details could not be parsed' }, { status: 422 });
      }

      const decoded = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
      const tabView = decoded?.store?.page?.data?.tab_view || {};
      const tabMeta = decoded?.store?.page?.data?.tab || {};
      const wikiTab = tabView?.wiki_tab || {};

      const rawContent = wikiTab.content || '';
      if (!rawContent) {
        return NextResponse.json({ error: 'No tab content found' }, { status: 404 });
      }

      const songName = decodeHtmlEntities(tabMeta.song_name || '');
      const artistName = decodeHtmlEntities(tabMeta.artist_name || '');
      const key = tabView?.meta?.tonality_name || tabMeta.tonality_name || '';
      const capo = tabView?.meta?.capo || tabMeta.capo || 0;
      const bpm = tabView?.meta?.bpm || 0;

      const lyrics = parseUgContent(rawContent, stripChords, songName, artistName);
      const withChords = parseUgContent(rawContent, false, songName, artistName);

      return NextResponse.json({
        song_name: songName,
        artist_name: artistName,
        key: key,
        capo: capo,
        bpm: bpm,
        lyrics: lyrics,
        content_with_chords: withChords,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use search or fetch.' }, { status: 400 });
  } catch (err: any) {
    console.error('Worship scraper error:', err);
    return NextResponse.json({ error: err.message || 'Scraper failed' }, { status: 500 });
  }
}
