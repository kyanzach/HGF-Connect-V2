import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

    // Fetch the page HTML
    const resp = await fetch(trimmed, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!resp.ok) {
      return NextResponse.json({ error: `Failed to fetch page (HTTP ${resp.status})` }, { status: 502 });
    }

    const html = await resp.text();

    // Extract article content from JustPaste.it
    // The main content is inside <div class="jp-article"> ... </div>
    // or inside <article> tags
    let content = '';

    // Try jp-article div first (main JustPaste content container)
    const jpArticleMatch = html.match(/<div[^>]*class="[^"]*\bjp-article\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    if (jpArticleMatch) {
      content = jpArticleMatch[1];
    } else {
      // Try article tag
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleMatch) {
        content = articleMatch[1];
      } else {
        // Fallback: try to find the main content area
        const bodyMatch = html.match(/<div[^>]*class="[^"]*\barticle\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (bodyMatch) {
          content = bodyMatch[1];
        } else {
          return NextResponse.json({ error: 'Could not extract content from page.' }, { status: 422 });
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
