/**
 * lib/youtube.ts — YouTube URL parser + transcript fetcher
 *
 * Uses YouTube's internal timedtext endpoint (no API key needed).
 * Falls back gracefully — returns null if transcript unavailable.
 * Uses IPv4-only agent to avoid the server's IPv6 ETIMEDOUT issue.
 */

import https from "https";
import http from "http";

// ── Extract video ID from various YouTube URL formats ────────────────────────
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // bare video ID
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ── IPv4-only HTTPS agent (avoids DigitalOcean droplet IPv6 hang) ────────────
const ipv4Agent = new https.Agent({ family: 4 });
const ipv4HttpAgent = new http.Agent({ family: 4 });

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https");
    const mod = isHttps ? https : http;
    const agent = isHttps ? ipv4Agent : ipv4HttpAgent;

    const req = mod.get(url, { agent, timeout: 15000 }, (res) => {
      // Follow redirects (301, 302, 303, 307, 308)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => { data += chunk; });
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

// ── Fetch transcript from YouTube timedtext API ──────────────────────────────
export async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    // Step 1: Get the video page HTML to extract caption track info
    const pageHtml = await httpsGet(`https://www.youtube.com/watch?v=${videoId}`);

    // Look for the captions player response JSON
    const captionMatch = pageHtml.match(/"captionTracks":\s*(\[[\s\S]*?\])/);
    if (!captionMatch) {
      console.warn("[youtube] No caption tracks found for video:", videoId);
      return null;
    }

    let captionTracks: any[];
    try {
      captionTracks = JSON.parse(captionMatch[1]);
    } catch {
      console.warn("[youtube] Failed to parse caption tracks JSON");
      return null;
    }

    if (!captionTracks.length) return null;

    // Prefer English, then any language
    const track =
      captionTracks.find((t: any) => t.languageCode === "en") ||
      captionTracks.find((t: any) => t.languageCode?.startsWith("en")) ||
      captionTracks[0];

    if (!track?.baseUrl) return null;

    // Step 2: Fetch the actual transcript XML
    const xmlUrl = track.baseUrl.replace(/&amp;/g, "&");
    const xml = await httpsGet(xmlUrl);

    // Step 3: Parse XML → plain text
    // Each <text> element contains a caption segment
    const segments: string[] = [];
    const textPattern = /<text[^>]*>([\s\S]*?)<\/text>/g;
    let match;
    while ((match = textPattern.exec(xml)) !== null) {
      let text = match[1];
      // Decode HTML entities
      text = text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/\n/g, " ");
      if (text.trim()) segments.push(text.trim());
    }

    if (!segments.length) {
      console.warn("[youtube] Caption XML parsed but no text segments found");
      return null;
    }

    const fullText = segments.join(" ");
    console.log(`[youtube] Transcript fetched: ${fullText.length} chars from ${segments.length} segments`);
    return fullText;
  } catch (error: any) {
    console.error("[youtube] Transcript fetch failed:", error?.message);
    return null;
  }
}

// ── Get YouTube thumbnail URL ────────────────────────────────────────────────
export function getThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
