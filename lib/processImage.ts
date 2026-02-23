import sharp from "sharp";

export type ImagePurpose = "profile" | "cover" | "listing";

const CONFIGS = {
  profile: { width: 400,  height: 400,       fit: "cover"  as const, quality: 85 },
  cover:   { width: 1200, height: 400,        fit: "cover"  as const, quality: 80 },
  listing: { width: 1200, height: undefined,  fit: "inside" as const, quality: 80 },
};

export interface ProcessedImage {
  buffer: Buffer;     // full-size WebP
  thumb:  Buffer | null; // 80×80 WebP thumbnail (profile only)
  ext:    "webp";
}

/**
 * Convert any uploaded image buffer to WebP.
 * - profile: 400×400 cover-crop + 80×80 thumbnail
 * - cover:   1200×400 cover-crop (banner)
 * - listing: max 1200px wide, preserve aspect ratio
 *
 * ⚠️  GIFs become static WebP (first frame). Validate at the route level.
 * ℹ️  HEIC from iPhone browsers arrives as JPEG automatically — no special handling needed.
 */
export async function processImage(
  buffer: Buffer,
  purpose: ImagePurpose
): Promise<ProcessedImage> {
  const cfg = CONFIGS[purpose];

  const full = await sharp(buffer)
    .resize(cfg.width, cfg.height ?? undefined, {
      fit:              cfg.fit,
      position:         "centre",
      withoutEnlargement: true,
    })
    .webp({ quality: cfg.quality })
    .toBuffer();

  // Thumbnail only for profile photos — used in directory cards
  let thumb: Buffer | null = null;
  if (purpose === "profile") {
    thumb = await sharp(buffer)
      .resize(80, 80, { fit: "cover", position: "centre" })
      .webp({ quality: 70 })
      .toBuffer();
  }

  return { buffer: full, thumb, ext: "webp" };
}
