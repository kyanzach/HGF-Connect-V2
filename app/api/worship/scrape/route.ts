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

const WORSHIP_ALIASES = [
  { match: /\b(scheck|zschech|darlene)\b/i, artists: ['darlene zschech', 'hillsong worship', 'hillsong live', 'hillsong united', 'hillsong'] },
  { match: /\b(hillsong)\b/i, artists: ['hillsong worship', 'hillsong united', 'hillsong live', 'hillsong young & free', 'darlene zschech'] },
  { match: /\b(brandon|lake)\b/i, artists: ['brandon lake', 'bethel music', 'elevation worship', 'maverick city'] },
  { match: /\b(bethel)\b/i, artists: ['bethel music', 'jenn johnson', 'brian johnson', 'steffany gretzinger'] },
  { match: /\b(elevation)\b/i, artists: ['elevation worship', 'steven furtick', 'maverick city'] },
  { match: /\b(maverick|mav)\b/i, artists: ['maverick city music', 'chandler moore', 'naomi raine'] },
  { match: /\b(tomlin|chris)\b/i, artists: ['chris tomlin', 'passion'] },
  { match: /\b(wickham|phil)\b/i, artists: ['phil wickham'] },
  { match: /\b(kari|jobe)\b/i, artists: ['kari jobe', 'cody carnes'] },
  { match: /\b(cody|carnes)\b/i, artists: ['cody carnes', 'kari jobe'] },
  { match: /\b(moen|don)\b/i, artists: ['don moen', 'integrity music'] },
  { match: /\b(sinach)\b/i, artists: ['sinach'] },
  { match: /\b(redman|matt)\b/i, artists: ['matt redman', 'passion'] },
  { match: /\b(cityalight)\b/i, artists: ['cityalight'] },
  { match: /\b(planetshakers)\b/i, artists: ['planetshakers'] },
  { match: /\b(cece|winans)\b/i, artists: ['cece winans'] },
  { match: /\b(lauren|daigle)\b/i, artists: ['lauren daigle'] },
  { match: /\b(crowder)\b/i, artists: ['crowder', 'david crowder band'] }
];

async function searchUGSingle(phrase: string, headers: Record<string, string>): Promise<any[]> {
  if (!phrase || phrase.trim().length < 2) return [];
  try {
    const searchUrl = `https://www.ultimate-guitar.com/search.php?title=${encodeURIComponent(phrase.trim())}`;
    const res = await fetch(searchUrl, { headers, cache: 'no-store' });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/class="js-store"\s+data-content="([^"]+)"/);
    if (!match) return [];
    const decoded = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    const rawResults = decoded?.store?.page?.data?.results || [];
    return rawResults.filter((r: any) => r.tab_url && r.song_name && (r.type === 'Chords' || r.type === 'Pro' || r.type === 'Tabs'));
  } catch {
    return [];
  }
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

      const q = query.trim().toLowerCase();
      const searchPhrases = new Set<string>();
      searchPhrases.add(q);

      // Strip common search noise / filler words
      const stripped = q.replace(/\b(by|of|from|feat|ft|the|a|an|song|lyrics|chords)\b/gi, ' ').replace(/\s+/g, ' ').trim();
      if (stripped && stripped !== q) searchPhrases.add(stripped);

      // Multi-word decomposition (e.g. 'you are near darlene' -> 'you are near')
      const words = stripped.split(' ');
      if (words.length >= 3) {
        for (let len = words.length - 1; len >= 2; len--) {
          searchPhrases.add(words.slice(0, len).join(' '));
        }
      }

      // Check artist aliases (e.g. 'darlene scheck' -> 'darlene zschech', 'hillsong worship')
      for (const item of WORSHIP_ALIASES) {
        if (item.match.test(q)) {
          for (const art of item.artists) {
            if (words.length >= 2) {
              searchPhrases.add(words.slice(0, 2).join(' ') + ' ' + art);
              searchPhrases.add(words.slice(0, 3).join(' '));
            }
          }
        }
      }

      const phraseList = Array.from(searchPhrases).slice(0, 6);
      const allResultsArrays = await Promise.all(phraseList.map(phrase => searchUGSingle(phrase, headers)));

      // Deduplicate results
      const map = new Map<string, any>();
      for (const arr of allResultsArrays) {
        for (const r of arr) {
          if (!map.has(r.tab_url)) {
            map.set(r.tab_url, r);
          }
        }
      }

      const queryTokens = q.split(/\s+/).filter(w => w.length > 1);

      // Relevance Scoring & Ranking
      const scoredResults = Array.from(map.values()).map(r => {
        let score = 0;
        const sTitle = (r.song_name || '').toLowerCase();
        const sArtist = (r.artist_name || '').toLowerCase();
        const votes = r.votes || 0;
        const rating = r.rating || 0;

        // Preferred formats
        if (r.type === 'Chords') score += 12;
        else if (r.type === 'Pro') score += 6;
        else if (r.type === 'Tabs') score += 3;

        // Title precision match
        if (sTitle === q || sTitle === stripped) score += 60;
        else if (sTitle.startsWith(stripped) || stripped.startsWith(sTitle)) score += 35;
        else if (sTitle.includes(stripped) || stripped.includes(sTitle)) score += 25;

        // Token match
        for (const t of queryTokens) {
          if (sTitle.includes(t)) score += 10;
          if (sArtist.includes(t)) score += 20; // High boost for matching artist
        }

        // Worship alias boost
        for (const alias of WORSHIP_ALIASES) {
          if (alias.match.test(q)) {
            for (const art of alias.artists) {
              if (sArtist.includes(art) || art.includes(sArtist)) {
                score += 25;
              }
            }
          }
        }

        // Popularity & community rating boost
        score += Math.min(votes / 8, 20);
        if (rating >= 4.5) score += 6;

        return {
          id: r.id,
          song_name: decodeHtmlEntities(r.song_name || ''),
          artist_name: decodeHtmlEntities(r.artist_name || ''),
          type: r.type,
          rating: r.rating ? Number(r.rating).toFixed(1) : null,
          votes: r.votes || 0,
          tab_url: r.tab_url,
          tonality_name: r.tonality_name || '',
          version: r.version || 1,
          _score: score,
        };
      });

      scoredResults.sort((a, b) => b._score - a._score);
      const results = scoredResults.slice(0, 20);

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
