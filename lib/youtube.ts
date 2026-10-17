/**
 * lib/youtube.ts — YouTube URL parser + transcript fetcher
 *
 * Primary: Uses YouTube InnerTube API (Android client context) for high-reliability caption extraction without API keys.
 * Fallback: Uses YouTube timedtext web scrape.
 * IPv4-only HTTP agent avoids DigitalOcean droplet IPv6 hang.
 */

import https from "https";
import http from "http";

// ── Extract video ID from various YouTube URL formats ────────────────────────
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i,
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/i,
  ];

  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

// ── IPv4-only HTTPS agent (avoids DigitalOcean droplet IPv6 hang) ────────────
const ipv4Agent = new https.Agent({ family: 4 });
const ipv4HttpAgent = new http.Agent({ family: 4 });

function httpsRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https");
    const mod = isHttps ? https : http;
    const agent = isHttps ? ipv4Agent : ipv4HttpAgent;
    const parsed = new URL(url);

    const reqOptions: https.RequestOptions = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: options.headers || {},
      agent,
      timeout: 15000,
    };

    const req = mod.request(reqOptions, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsRequest(res.headers.location, options).then(resolve).catch(reject);
      }
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        data += chunk;
      });
      res.on("end", () => resolve(data));
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTranscriptXml(xml: string): string[] {
  const segments: string[] = [];

  // Format 3: <p t="..." d="..."><s>word</s>...</p>
  const pRegex = /<p\s+[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  let foundP = false;

  while ((match = pRegex.exec(xml)) !== null) {
    foundP = true;
    let inner = match[1];
    // Strip XML tags inside <p>, leaving text
    inner = inner.replace(/<[^>]+>/g, " ");
    const cleaned = decodeHtmlEntities(inner);
    if (cleaned && !cleaned.startsWith("[Music]") && !cleaned.startsWith("[Applause]")) {
      segments.push(cleaned);
    }
  }

  if (foundP && segments.length > 0) {
    return segments;
  }

  // Classic format: <text start="..." dur="...">content</text>
  const textPattern = /<text[^>]*>([\s\S]*?)<\/text>/g;
  while ((match = textPattern.exec(xml)) !== null) {
    let inner = match[1].replace(/<[^>]+>/g, " ");
    const cleaned = decodeHtmlEntities(inner);
    if (cleaned) {
      segments.push(cleaned);
    }
  }

  return segments;
}

export interface TranscriptResult {
  text: string;
  title?: string;
  language?: string;
  segmentCount: number;
  wordCount: number;
  charCount: number;
}

// ── Fetch transcript details from YouTube ────────────────────────────────────
export async function fetchTranscriptWithMeta(videoId: string): Promise<TranscriptResult | null> {
  const cleanId = extractVideoId(videoId);
  if (!cleanId) return null;

  // Method 1: YouTube InnerTube API (Android client) — most reliable
  try {
    const innertubeBody = JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "20.10.38",
        },
      },
      videoId: cleanId,
    });

    const respText = await httpsRequest("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
      },
      body: innertubeBody,
    });

    const data = JSON.parse(respText);
    const videoTitle = data?.videoDetails?.title;
    const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (Array.isArray(captionTracks) && captionTracks.length > 0) {
      // Pick English or first track
      const track =
        captionTracks.find((t: any) => t.languageCode === "en") ||
        captionTracks.find((t: any) => t.languageCode?.startsWith("en")) ||
        captionTracks[0];

      if (track?.baseUrl) {
        const xml = await httpsRequest(track.baseUrl, {
          headers: {
            "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
          },
        });

        const segments = parseTranscriptXml(xml);
        if (segments.length > 0) {
          const fullText = segments.join(" ");
          const words = fullText.split(/\s+/).filter(Boolean);
          const langName = track.name?.runs?.[0]?.text || track.name?.simpleText || track.languageCode || "English";

          console.log(`[youtube] InnerTube transcript fetched for ${cleanId}: ${words.length} words, ${segments.length} segments (${langName})`);
          return {
            text: fullText,
            title: videoTitle,
            language: langName,
            segmentCount: segments.length,
            wordCount: words.length,
            charCount: fullText.length,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[youtube] InnerTube fetch failed for ${cleanId}:`, err?.message);
  }

  // Method 2: Fallback to web page scrape
  try {
    const pageHtml = await httpsRequest(`https://www.youtube.com/watch?v=${cleanId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const captionMatch = pageHtml.match(/"captionTracks":\s*(\[[\s\S]*?\])/);
    if (captionMatch) {
      const captionTracks = JSON.parse(captionMatch[1]);
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        const track =
          captionTracks.find((t: any) => t.languageCode === "en") ||
          captionTracks.find((t: any) => t.languageCode?.startsWith("en")) ||
          captionTracks[0];

        if (track?.baseUrl) {
          const xmlUrl = track.baseUrl.replace(/&amp;/g, "&");
          const xml = await httpsRequest(xmlUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
              Referer: "https://www.youtube.com/",
            },
          });

          const segments = parseTranscriptXml(xml);
          if (segments.length > 0) {
            const fullText = segments.join(" ");
            const words = fullText.split(/\s+/).filter(Boolean);
            const langName = track.name?.simpleText || track.languageCode || "English";

            console.log(`[youtube] Web scrape transcript fetched for ${cleanId}: ${words.length} words`);
            return {
              text: fullText,
              language: langName,
              segmentCount: segments.length,
              wordCount: words.length,
              charCount: fullText.length,
            };
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[youtube] Web scrape fallback failed for ${cleanId}:`, err?.message);
  }

  return null;
}

// ── Backwards-compatible helper ──────────────────────────────────────────────
export async function fetchTranscript(videoId: string): Promise<string | null> {
  const result = await fetchTranscriptWithMeta(videoId);
  return result ? result.text : null;
}

// ── Get YouTube thumbnail URL ────────────────────────────────────────────────
export function getThumbnailUrl(videoId: string): string {
  const cleanId = extractVideoId(videoId) || videoId;
  return `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`;
}
