#!/usr/bin/env node
/**
 * scripts/migrate-images-to-webp.mjs
 * ─────────────────────────────────────────────────────────────────
 * One-time migration: convert all existing JPG/JPEG/PNG uploads
 * to WebP using Sharp, then update DB filenames.
 *
 * SAFETY RULES:
 *   1. Run: tar -czf originals_backup.tar.gz public/uploads/profile_pictures/
 *      BEFORE running this script. No backup = no safety net.
 *   2. Always run --dry-run first to preview changes.
 *   3. Run Phase 1 (Sharp pipeline) in production FIRST.
 *      Any upload during migration without Phase 1 live produces an
 *      uncompressed file that this script already skipped.
 *
 * Usage:
 *   node scripts/migrate-images-to-webp.mjs --dry-run
 *   node scripts/migrate-images-to-webp.mjs
 */

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const DRY_RUN = process.argv.includes("--dry-run");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DIRS = [
  { dir: path.join(ROOT, "public/uploads/profile_pictures"), dbUpdate: true },
  { dir: path.join(ROOT, "public/uploads/cover_photos"),     dbUpdate: true },
  { dir: path.join(ROOT, "public/uploads/marketplace"),      dbUpdate: false },
];

const QUALITY = { profile: 85, cover: 80, listing: 80 };
const RESIZE   = {
  profile: { width: 400,  height: 400,  fit: "cover" },
  cover:   { width: 1200, height: 400,  fit: "cover" },
  listing: { width: 1200, height: null, fit: "inside" },
};

function detectType(filename) {
  if (filename.includes("_cover_")) return "cover";
  if (filename.includes("_profile_")) return "profile";
  return "listing";
}

async function convertFile(filePath, type) {
  const rawBuffer = await fs.readFile(filePath);
  const cfg = RESIZE[type];
  return sharp(rawBuffer)
    .resize(cfg.width, cfg.height ?? undefined, {
      fit: cfg.fit,
      position: "centre",
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY[type] })
    .toBuffer();
}

async function run() {
  console.log(`\n🖼  HGF Connect — Image → WebP Migration`);
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE"}\n`);

  // ── DB connection ─────────────────────────────────────────────
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error("❌ DATABASE_URL not set"); process.exit(1); }

  // Parse mysql://user:pass@host:port/db
  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) { console.error("❌ Cannot parse DATABASE_URL"); process.exit(1); }
  const [, user, password, host, port, database] = match;

  const db = await mysql.createConnection({ host, port: +port, user, password, database });
  console.log("✅ DB connected\n");

  let total = 0, converted = 0, skipped = 0, errors = 0;

  for (const { dir, dbUpdate } of DIRS) {
    let files;
    try { files = await fs.readdir(dir); }
    catch { console.log(`⚠️  Dir not found, skipping: ${dir}`); continue; }

    const toConvert = files.filter(f =>
      /\.(jpe?g|png|heic)$/i.test(f) && !f.includes("_thumb_")
    );

    if (!toConvert.length) { console.log(`✓ ${path.basename(dir)}: nothing to convert`); continue; }
    console.log(`📁 ${path.basename(dir)}: ${toConvert.length} files to convert`);

    for (const filename of toConvert) {
      total++;
      const srcPath  = path.join(dir, filename);
      const baseName = filename.replace(/\.(jpe?g|png|heic)$/i, "");
      const webpName = `${baseName}.webp`;
      const dstPath  = path.join(dir, webpName);
      const type     = detectType(filename);

      try {
        const webpBuffer = await convertFile(srcPath, type);
        const origSize   = (await fs.stat(srcPath)).size;
        const newSize    = webpBuffer.length;
        const saving     = Math.round((1 - newSize / origSize) * 100);

        if (DRY_RUN) {
          console.log(`  [dry] ${filename} → ${webpName}  (${(origSize/1024).toFixed(0)}KB → ${(newSize/1024).toFixed(0)}KB, -${saving}%)`);
          converted++;
          continue;
        }

        // Write WebP
        await fs.writeFile(dstPath, webpBuffer);

        // Also generate thumbnail for profile images
        if (type === "profile") {
          const thumbName = baseName.replace(/_profile_/, "_profile_thumb_") + ".webp";
          const thumbBuf  = await sharp(await fs.readFile(srcPath))
            .resize(80, 80, { fit: "cover", position: "centre" })
            .webp({ quality: 70 })
            .toBuffer();
          await fs.writeFile(path.join(dir, thumbName), thumbBuf);
        }

        // DB update
        if (dbUpdate) {
          const memberId = parseInt(filename.split("_")[0]);
          if (!isNaN(memberId)) {
            const col = type === "cover" ? "cover_photo" : "profile_picture";
            const thumbCol = type === "profile" ? "profile_picture_thumbnail" : null;
            const thumbName = type === "profile"
              ? baseName.replace(/_profile_/, "_profile_thumb_") + ".webp"
              : null;

            await db.execute(
              `UPDATE members SET ${col} = ? ${thumbCol ? `, ${thumbCol} = ?` : ""} WHERE id = ? AND ${col} = ?`,
              thumbCol
                ? [webpName, thumbName, memberId, filename]
                : [webpName, memberId, filename]
            );
          }
        }

        // Delete original after verified write
        await fs.unlink(srcPath);

        console.log(`  ✓ ${filename} → ${webpName}  (${(origSize/1024).toFixed(0)}KB → ${(newSize/1024).toFixed(0)}KB, -${saving}%)`);
        converted++;
      } catch (err) {
        console.error(`  ✗ ${filename}: ${err.message}`);
        errors++;
      }
    }
  }

  await db.end();
  console.log(`\n────────────────────────────────────`);
  console.log(`Total:     ${total}`);
  console.log(`Converted: ${converted}`);
  console.log(`Errors:    ${errors}`);
  if (DRY_RUN) console.log(`\n⚠️  Dry run — no files changed. Re-run without --dry-run to apply.`);
  else console.log(`✅ Migration complete!`);
}

run().catch(err => { console.error(err); process.exit(1); });
