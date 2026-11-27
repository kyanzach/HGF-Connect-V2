import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface YouTubeMatch {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
}

interface CacheEntry {
  results: YouTubeMatch[];
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 200;
const searchCache = new Map<string, CacheEntry>();

function setCache(key: string, results: YouTubeMatch[]) {
  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
}

function extractVideosFromYtInitialData(html: string): YouTubeMatch[] {
  const results: YouTubeMatch[] = [];
  const seen = new Set<string>();

  // Try parsing ytInitialData JSON first for clean titles, channels, and durations
  const marker = 'var ytInitialData = ';
  const startIdx = html.indexOf(marker);
  if (startIdx !== -1) {
    const jsonStart = startIdx + marker.length;
    const endIdx = html.indexOf(';</script>', jsonStart);
    if (endIdx !== -1) {
      try {
        const data = JSON.parse(html.slice(jsonStart, endIdx));
        const sections =
          data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
            ?.sectionListRenderer?.contents || [];

        for (const section of sections) {
          const items = section?.itemSectionRenderer?.contents || [];
          for (const item of items) {
            const vr = item?.videoRenderer;
            if (!vr?.videoId || seen.has(vr.videoId)) continue;
            // Skip live streams (no lengthText) or shorts (< 60s)
            const duration = vr.lengthText?.simpleText || '';
            if (!duration) continue;

            const title =
              vr.title?.runs?.map((r: any) => r.text).join('') ||
              vr.title?.simpleText ||
              '';
            const channel =
              vr.ownerText?.runs?.map((r: any) => r.text).join('') ||
              vr.longBylineText?.runs?.map((r: any) => r.text).join('') ||
              '';

            seen.add(vr.videoId);
            results.push({
              videoId: vr.videoId,
              title: title.trim(),
              channel: channel.trim(),
              duration: duration.trim(),
            });
            if (results.length >= 8) break;
          }
          if (results.length >= 8) break;
        }
      } catch {
        // Fall through to regex fallback below
      }
    }
  }

  // Regex fallback if YouTube changes ytInitialData wrapper
  if (results.length === 0) {
    const idRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    let m: RegExpExecArray | null;
    while ((m = idRegex.exec(html)) !== null) {
      const videoId = m[1];
      if (seen.has(videoId)) continue;
      seen.add(videoId);
      results.push({ videoId, title: '', channel: '', duration: '' });
      if (results.length >= 5) break;
    }
  }

  return results;
}

function rankResults(results: YouTubeMatch[], title: string, artist: string): YouTubeMatch[] {
  const titleLower = title.toLowerCase();
  const artistLower = artist.toLowerCase();

  return [...results].sort((a, b) => {
    const score = (item: YouTubeMatch) => {
      const t = `${item.title} ${item.channel}`.toLowerCase();
      let s = 0;
      if (titleLower && t.includes(titleLower)) s += 6;
      if (artistLower && t.includes(artistLower)) s += 5;
      if (/official|lyric|audio|live|worship/i.test(t)) s += 2;
      if (/tutorial|lesson|guitar cover|piano cover|karaoke|instrumental|drum cover/i.test(t)) s -= 4;
      if (/shorts|#shorts/i.test(t)) s -= 8;
      return s;
    };
    return score(b) - score(a);
  });
}

export async function GET(req: NextRequest) {
  try {
    const title = (req.nextUrl.searchParams.get('title') || '').trim();
    const artist = (req.nextUrl.searchParams.get('artist') || '').trim();

    if (!title) {
      return NextResponse.json({ error: 'Song title is required' }, { status: 400 });
    }

    const cacheKey = `${title.toLowerCase()}|${artist.toLowerCase()}`;
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        best: cached.results[0] || null,
        results: cached.results,
        cached: true,
      });
    }

    const query = artist ? `${title} ${artist} official` : `${title} worship song`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'CONSENT=YES+cb',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `YouTube search failed (${res.status})` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const extracted = extractVideosFromYtInitialData(html);
    const ranked = rankResults(extracted, title, artist).slice(0, 5);

    if (ranked.length > 0) {
      setCache(cacheKey, ranked);
    }

    return NextResponse.json({
      best: ranked[0] || null,
      results: ranked,
      cached: false,
    });
  } catch (err: any) {
    console.error('[api/worship/youtube]', err?.message);
    return NextResponse.json(
      { error: 'Could not search YouTube right now' },
      { status: 500 }
    );
  }
}
