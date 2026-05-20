import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import http from 'http';

export const dynamic = 'force-dynamic';

// Force IPv4 agent — JustPaste.it has an IPv6 AAAA record that is
// unreachable from the DigitalOcean droplet, causing Node.js fetch()
// to hang with ETIMEDOUT. Using https.Agent with family:4 forces IPv4.
const ipv4Agent = new https.Agent({ family: 4 });
const ipv4AgentHttp = new http.Agent({ family: 4 });

/**
 * Fetch a URL using Node.js http/https with IPv4 forced.
 * Returns the response body as a string.
 */
function fetchIPv4(url: string, maxRedirects = 5): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const mod = isHttps ? https : http;
    const agent = isHttps ? ipv4Agent : ipv4AgentHttp;

    const req = mod.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    }, (res) => {
      // Handle redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) { reject(new Error('Too many redirects')); return; }
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume(); // drain the response
        fetchIPv4(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode || 200, body: data }));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

/**
 * POST /api/thewordtool/import
 * Body: { url: string }
 * Fetches the HTML from a JustPaste.it (or jpst.it) URL,
 * extracts the article body text, and returns it as plain text.
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Validate URL is a JustPaste.it or jpst.it link
    const trimmed = url.trim();
    const isJustPaste = /^https?:\/\/(www\.)?(justpaste\.it|jpst\.it)\//i.test(trimmed);
    if (!isJustPaste) {
      return NextResponse.json({ error: 'Only JustPaste.it and jpst.it URLs are supported.' }, { status: 400 });
    }

    // Fetch the page HTML using IPv4-forced agent
    const { status, body: html } = await fetchIPv4(trimmed);

    if (status !== 200) {
      return NextResponse.json({ error: `Failed to fetch page (HTTP ${status})` }, { status: 502 });
    }

    // Extract article content from JustPaste.it
    // The main content is inside <div id="articleContent"> ... </div>
    let content = '';

    // Try id="articleContent" first (actual JustPaste.it DOM structure)
    const articleContentMatch = html.match(/<div\s+id="articleContent"[^>]*>([\s\S]*?)<\/div>\s*(?:<div\s+(?:id|class)=)/i);
    if (articleContentMatch) {
      content = articleContentMatch[1];
    } else {
      // Greedy fallback for articleContent (grab everything until a known footer element)
      const articleFallback = html.match(/<div\s+id="articleContent"[^>]*>([\s\S]*?)<div\s+class="articleBottomWidgetPlaceholder"/i);
      if (articleFallback) {
        content = articleFallback[1];
      } else {
        // Try jp-article div
        const jpArticleMatch = html.match(/<div[^>]*class="[^"]*\bjp-article\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
        if (jpArticleMatch) {
          content = jpArticleMatch[1];
        } else {
          // Try article tag
          const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
          if (articleMatch) {
            content = articleMatch[1];
          } else {
            return NextResponse.json({ error: 'Could not extract content from page.' }, { status: 422 });
          }
        }
      }
    }

    // Convert HTML to clean text
    // Replace <br> and block-level closing tags with newlines
    content = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
      .replace(/<(?:p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n')
      .replace(/<hr[^>]*>/gi, '\n---\n')
      // Remove all other HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      // Remove lines that are only whitespace (common &nbsp; empty paragraphs)
      .replace(/^\s+$/gm, '')
      // Clean up: collapse 3+ newlines into 2
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!content) {
      return NextResponse.json({ error: 'Page content appears to be empty.' }, { status: 422 });
    }

    // Extract title from the page
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/\s*-\s*JustPaste\.it\s*$/i, '').trim() : '';

    return NextResponse.json({ content, title: rawTitle });
  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
