import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import axios from "axios";

export const dynamic = "force-dynamic";

// Simple HTML meta tag scraper
function extractMeta(html: string, regexes: { [key: string]: RegExp }): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, regex] of Object.entries(regexes)) {
    const match = html.match(regex);
    if (match && match[1]) {
      // Decode HTML entities basic
      result[key] = match[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .trim();
    }
  }
  return result;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // 5-second timeout constraint
    const response = await axios.get(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
      },
      timeout: 5000,
    });

    const html = response.data;
    if (typeof html !== "string") {
      throw new Error("Invalid response format");
    }

    const meta = extractMeta(html, {
      title: /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      titleAlt: /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
      titleTag: /<title[^>]*>([^<]+)<\/title>/i,
      description: /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
      descriptionAlt: /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i,
      descriptionTag: /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
      image: /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      imageAlt: /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    });

    const title = meta.title || meta.titleAlt || meta.titleTag || "Link Preview";
    const description = meta.description || meta.descriptionAlt || meta.descriptionTag || "";
    const image = meta.image || meta.imageAlt || "";

    return NextResponse.json({
      title,
      description,
      image,
      url: targetUrl,
    });
  } catch (err: unknown) {
    console.error("[api/metadata]", (err as Error).message);
    // Return graceful fallback title on fetch failures so input is never blocked
    try {
      const urlObj = new URL(targetUrl);
      return NextResponse.json({
        title: urlObj.hostname || "Shared Link",
        description: "Click to open link.",
        image: "",
        url: targetUrl,
      });
    } catch {
      return NextResponse.json({
        title: "Shared Link",
        description: "Click to open link.",
        image: "",
        url: targetUrl,
      });
    }
  }
}
