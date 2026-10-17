/**
 * lib/ytBookmarklet.ts — "Copy Sermon CC" browser bookmarklet.
 *
 * Runs inside the pastor's own YouTube tab (residential IP, never bot-walled),
 * grabs the caption track, and copies plain text to the clipboard.
 * React blocks `javascript:` hrefs, so the URL is attached via DOM setAttribute.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function grabSermonCC() {
  const decode = (s: string) =>
    s
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

  const parse = (xml: string) => {
    const out: string[] = [];
    let m: RegExpExecArray | null;
    const p = /<p\s[^>]*>([\s\S]*?)<\/p>/g;
    while ((m = p.exec(xml))) {
      const t = decode(m[1]);
      if (t && !/^\[(Music|Applause)\]$/i.test(t)) out.push(t);
    }
    if (!out.length) {
      const t2 = /<text[^>]*>([\s\S]*?)<\/text>/g;
      while ((m = t2.exec(xml))) {
        const t = decode(m[1]);
        if (t) out.push(t);
      }
    }
    return out.join(" ");
  };

  const pick = (tracks: any[]) =>
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => (t.languageCode || "").indexOf("en") === 0) ||
    tracks[0];

  (async () => {
    try {
      const vid = new URLSearchParams(location.search).get("v");
      if (!vid) {
        alert("Open the sermon video page on YouTube first, then click this bookmark.");
        return;
      }
      let text = "";

      // Attempt 1: tracks already on the page
      const pr = (window as any).ytInitialPlayerResponse;
      let tracks: any[] = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      if (tracks.length) {
        try {
          text = parse(await (await fetch(pick(tracks).baseUrl)).text());
        } catch {
          /* fall through */
        }
      }

      // Attempt 2: same-origin InnerTube player call
      if (!text) {
        const r = await fetch("/youtubei/v1/player?prettyPrint=false", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
            videoId: vid,
          }),
        });
        const d = await r.json();
        tracks = d?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        if (tracks.length) text = parse(await (await fetch(pick(tracks).baseUrl)).text());
      }

      if (!text) {
        alert("No captions could be read. Turn CC on once in the player, wait a few seconds, then click again.");
        return;
      }
      await navigator.clipboard.writeText(text);
      alert(
        "Copied " +
          text.split(/\s+/).length.toLocaleString() +
          " words of sermon captions!\n\nGo back to HGF Connect and click Paste from Clipboard."
      );
    } catch (e: any) {
      alert("Copy failed: " + (e && e.message ? e.message : e));
    }
  })();
}

export const SERMON_CC_BOOKMARKLET = "javascript:" + encodeURIComponent("(" + grabSermonCC.toString() + ")()");
