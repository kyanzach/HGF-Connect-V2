/**
 * Presentation download and asset utilities
 */

export function getPresentationDownloadFilename(event: {
  title?: string | null;
  commentary?: string | null;
  presentationFile?: string | null;
  presentationOriginalName?: string | null;
}): string {
  const isPdf = event.presentationFile?.toLowerCase().endsWith(".pdf");
  const ext = isPdf ? ".pdf" : ".pptx";

  let derivedTitle = "";
  if (event.commentary) {
    const lines = event.commentary.split("\n");
    const firstNonEmpty = lines.find((l) => l.trim().length > 0) || "";
    if (firstNonEmpty.trim().startsWith("#")) {
      derivedTitle = firstNonEmpty.replace(/^#+\s*/, "").trim();
    }
  }

  if (!derivedTitle && event.title) {
    derivedTitle = event.title.trim();
  }

  if (!derivedTitle && event.presentationOriginalName) {
    derivedTitle = event.presentationOriginalName.replace(/\.[^/.]+$/, "").trim();
  }

  if (!derivedTitle) {
    derivedTitle = "Sermon Slide Deck";
  }

  // Remove invalid filename characters across OSes: / \ : * ? " < > |
  const cleanBaseName = derivedTitle
    .replace(/[/\\:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Sermon Slide Deck";

  return `${cleanBaseName}${ext}`;
}
