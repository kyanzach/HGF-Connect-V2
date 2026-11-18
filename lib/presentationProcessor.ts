import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import pptxgen from "pptxgenjs";
import { randomUUID } from "crypto";
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";
import { callOpenAI } from "./ai";

const execFileAsync = promisify(execFile);
const EXEC_OPTS = { maxBuffer: 25 * 1024 * 1024 };

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv"]);
const IGNORED_FILENAMES = new Set(["thumbs.db", "desktop.ini", ".ds_store"]);

export interface SlideItem {
  image: string;
  video?: string | null;
  videoType?: string | null;
  page: number;
}

export interface ProcessedPresentation {
  presentationFile: string;
  presentationOriginalName: string;
  presentationSlides: SlideItem[];
  commentary?: string | null;
}

interface UnifiedZipMediaEntry {
  fullPath: string;
  relPath: string;
  baseName: string;
  ext: string;
  kind: "image" | "video";
  seqNum: number | null;
  cleanLabel: string;
}

interface SequenceSlideRecord {
  page: number;
  kind: "image" | "video";
  ocrSourcePath?: string;
  slideDestPath: string;
  webImagePath: string;
  videoUrl: string | null;
  videoType: string | null;
  localVideoPath: string | null;
  targetVideoExt?: string;
  zipOutputName: string;
}

async function getFilesRecursively(dir: string, rootDir: string = dir): Promise<{ fullPath: string; relPath: string }[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: { fullPath: string; relPath: string }[] = [];

  for (const entry of entries) {
    const nameLower = entry.name.toLowerCase();
    // Skip macOS metadata (__MACOSX, ._*, .DS_Store) and Windows system thumbnails
    if (
      entry.name.startsWith(".") ||
      entry.name.startsWith("__MACOSX") ||
      IGNORED_FILENAMES.has(nameLower)
    ) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      results.push(...(await getFilesRecursively(fullPath, rootDir)));
    } else if (entry.isFile()) {
      results.push({ fullPath, relPath });
    }
  }

  return results;
}

/**
 * Extracts a numerical sequence index and human-readable label from filenames like:
 * - "01 slide.jpg" -> { seqNum: 1, cleanLabel: "slide" }
 * - "02 video.mp4" -> { seqNum: 2, cleanLabel: "video" }
 * - "10 - Worship Intro.mp4" -> { seqNum: 10, cleanLabel: "Worship Intro" }
 * - "Slide 3.jpg" -> { seqNum: 3, cleanLabel: "Slide" }
 * - "Sermon Deck (12).png" -> { seqNum: 12, cleanLabel: "Sermon Deck" }
 * - "1.jpg" -> { seqNum: 1, cleanLabel: "" }
 */
export function parseSequenceKey(filename: string): { seqNum: number | null; cleanLabel: string } {
  const ext = path.extname(filename);
  const stem = path.basename(filename, ext).trim();

  // 1. Leading number: "01 slide", "02 - video", "10_clip", "3", "02.5 insert"
  const leadingMatch = stem.match(/^(\d+(?:\.\d+)?)(?:[\s._-]+(.*))?$/);
  if (leadingMatch) {
    const seqNum = parseFloat(leadingMatch[1]);
    const cleanLabel = (leadingMatch[2] || "").trim();
    return { seqNum: Number.isFinite(seqNum) ? seqNum : null, cleanLabel };
  }

  // 2. Keyword + number: "Slide 01", "Page 2 - Intro", "Video 10"
  const keywordMatch = stem.match(/^(slide|page|item|frame|img|image|vid|video)[\s._-]*(\d+(?:\.\d+)?)(?:[\s._-]+(.*))?$/i);
  if (keywordMatch) {
    const seqNum = parseFloat(keywordMatch[2]);
    const suffix = (keywordMatch[3] || "").trim();
    const cleanLabel = suffix || keywordMatch[1];
    return { seqNum: Number.isFinite(seqNum) ? seqNum : null, cleanLabel };
  }

  // 3. Trailing parenthesized number (common Canva/OS duplicate style): "Sermon (1)", "Sermon (10)"
  const parenMatch = stem.match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (parenMatch) {
    const seqNum = parseInt(parenMatch[2], 10);
    const cleanLabel = (parenMatch[1] || "").trim();
    return { seqNum: Number.isFinite(seqNum) ? seqNum : null, cleanLabel };
  }

  // 4. Trailing number after separator: "Canva_Slide_10"
  const trailingMatch = stem.match(/^(.*?)[\s._-]+(\d+)$/);
  if (trailingMatch) {
    const seqNum = parseInt(trailingMatch[2], 10);
    const cleanLabel = (trailingMatch[1] || "").trim();
    return { seqNum: Number.isFinite(seqNum) ? seqNum : null, cleanLabel };
  }

  return { seqNum: null, cleanLabel: stem };
}

function compareSequenceEntries(a: UnifiedZipMediaEntry, b: UnifiedZipMediaEntry): number {
  if (a.seqNum !== null && b.seqNum !== null) {
    if (a.seqNum !== b.seqNum) {
      return a.seqNum - b.seqNum;
    }
    // Tie-breaker if two files share the exact same number (e.g. "02.jpg" and "02b.mp4")
    const cmpName = a.baseName.localeCompare(b.baseName, undefined, { numeric: true, sensitivity: "base" });
    if (cmpName !== 0) return cmpName;
    if (a.kind !== b.kind) return a.kind === "image" ? -1 : 1;
    return a.relPath.localeCompare(b.relPath, undefined, { numeric: true, sensitivity: "base" });
  }

  if (a.seqNum !== null) return -1;
  if (b.seqNum !== null) return 1;

  return a.relPath.localeCompare(b.relPath, undefined, { numeric: true, sensitivity: "base" });
}

function sanitizeZipLabel(raw: string): string {
  return raw
    .replace(/[/\\:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveVideoMimeType(ext: string): string {
  if (ext === ".webm") return "video/webm";
  return "video/mp4";
}

/**
 * Generates a 1920x1080 JPEG poster thumbnail for a standalone video item.
 * Extracts an actual frame via ffmpeg (at 1.0s, falling back to 0.0s for <1s clips),
 * and falls back to a clean 16:9 dark-slate SVG cinema card via Sharp if ffmpeg fails.
 */
async function generateVideoPoster(
  videoPath: string,
  destJpgPath: string,
  tempDir: string,
  seqPage: number,
  displayLabel: string
): Promise<void> {
  const rawFramePath = path.join(tempDir, `vid-frame-${seqPage}.jpg`);

  let frameExtracted = false;
  for (const seekTime of ["00:00:01", "00:00:00"]) {
    try {
      await execFileAsync(
        "ffmpeg",
        ["-y", "-ss", seekTime, "-i", videoPath, "-frames:v", "1", "-q:v", "2", rawFramePath],
        { ...EXEC_OPTS, timeout: 15000 }
      );
      const st = await fs.stat(rawFramePath).catch(() => null);
      if (st && st.size > 0) {
        frameExtracted = true;
        break;
      }
    } catch {
      // Try next seek point or SVG fallback
    }
  }

  if (frameExtracted) {
    try {
      await sharp(rawFramePath)
        .resize({
          width: 1920,
          height: 1080,
          fit: "contain",
          background: { r: 15, g: 23, b: 42 },
        })
        .jpeg({ quality: 80, progressive: true })
        .toFile(destJpgPath);
      await fs.unlink(rawFramePath).catch(() => {});
      return;
    } catch {
      // Fall through to SVG card
    }
  }

  const safeTitle = escapeXmlText((displayLabel || `Video Slide ${seqPage}`).slice(0, 48));
  const svgCard = `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#0f172a"/>
    <circle cx="960" cy="490" r="96" fill="#4EB1CB" fill-opacity="0.18" stroke="#4EB1CB" stroke-width="4"/>
    <polygon points="932,442 932,538 1014,490" fill="#4EB1CB"/>
    <text x="960" y="655" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="44" font-weight="700">${safeTitle}</text>
    <text x="960" y="715" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="28">Slide ${seqPage} • Video Media</text>
  </svg>`;

  await sharp(Buffer.from(svgCard))
    .jpeg({ quality: 82, progressive: true })
    .toFile(destJpgPath);
}

export async function processPresentation(
  filePath: string,
  originalName: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ProcessedPresentation> {
  const uuid = randomUUID();
  const tempDir = path.join(process.cwd(), "tmp", `pres-${uuid}`);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "presentations");
  const slidesDir = path.join(uploadDir, "slides");
  const videosDir = path.join(uploadDir, "videos");

  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.mkdir(slidesDir, { recursive: true });
  await fs.mkdir(videosDir, { recursive: true });

  const ext = path.extname(filePath).toLowerCase();
  const isZip = ext === ".zip";

  let pdfPath = filePath;
  let extractedText = "";
  const slideMediaMap = new Map<
    number,
    { videoUrl: string; videoType: string; localVideoPath: string; targetExt: string }
  >();

  const sequenceRecords: SequenceSlideRecord[] = [];
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";

  try {
    // =========================================================================
    // PATH A: Native Canva Slideshow ZIP OR Hybrid Canva JPG + MP4 Sequence ZIP
    // =========================================================================
    if (isZip) {
      onProgress?.(10, "Extracting slideshow & media sequence from ZIP archive...");
      const unpackedZipDir = path.join(tempDir, "canva_unpacked");
      await fs.mkdir(unpackedZipDir, { recursive: true });
      await execFileAsync("unzip", ["-q", "-o", filePath, "-d", unpackedZipDir], EXEC_OPTS);

      const discoveredFiles = await getFilesRecursively(unpackedZipDir);
      const mediaEntries: UnifiedZipMediaEntry[] = [];

      for (const item of discoveredFiles) {
        const itemExt = path.extname(item.fullPath).toLowerCase();
        const isImg = IMAGE_EXTS.has(itemExt);
        const isVid = VIDEO_EXTS.has(itemExt);
        if (!isImg && !isVid) continue;

        const baseName = path.basename(item.fullPath);
        const { seqNum, cleanLabel } = parseSequenceKey(baseName);

        mediaEntries.push({
          fullPath: item.fullPath,
          relPath: item.relPath,
          baseName,
          ext: itemExt,
          kind: isImg ? "image" : "video",
          seqNum,
          cleanLabel,
        });
      }

      if (mediaEntries.length === 0) {
        throw new Error(
          "No slide images (JPG, PNG, WebP) or videos (MP4, MOV, WebM) found inside the ZIP archive."
        );
      }

      // Sort all images AND videos together into a single numerical sequence
      mediaEntries.sort(compareSequenceEntries);

      const totalCount = mediaEntries.length;
      const padLength = Math.max(2, String(totalCount).length);
      const imageCount = mediaEntries.filter((e) => e.kind === "image").length;
      const videoCount = mediaEntries.filter((e) => e.kind === "video").length;

      onProgress?.(
        25,
        `Sequencing ${totalCount} items (${imageCount} slide${imageCount === 1 ? "" : "s"}${
          videoCount > 0 ? `, ${videoCount} video${videoCount === 1 ? "" : "s"}` : ""
        })...`
      );

      for (let i = 0; i < totalCount; i++) {
        const entry = mediaEntries[i];
        const seqPage = i + 1;
        const pad3 = String(seqPage).padStart(3, "0");
        const padSeq = String(seqPage).padStart(padLength, "0");
        const slideFilename = `${uuid}-slide-${pad3}.jpg`;
        const slideDestPath = path.join(slidesDir, slideFilename);
        const webImagePath = `/uploads/presentations/slides/${slideFilename}`;

        const progressPct = 25 + Math.floor(((i + 1) / totalCount) * 25);
        const safeLabel = sanitizeZipLabel(entry.cleanLabel);

        if (entry.kind === "image") {
          onProgress?.(progressPct, `Optimizing slide ${seqPage} of ${totalCount}...`);

          await sharp(entry.fullPath)
            .rotate()
            .resize({
              width: 1920,
              height: 1080,
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({ quality: 82, progressive: true })
            .toFile(slideDestPath);

          const zipOutputName = safeLabel
            ? `${padSeq} - ${safeLabel}.jpg`
            : `${padSeq} - Slide ${padSeq}.jpg`;

          sequenceRecords.push({
            page: seqPage,
            kind: "image",
            ocrSourcePath: slideDestPath,
            slideDestPath,
            webImagePath,
            videoUrl: null,
            videoType: null,
            localVideoPath: null,
            zipOutputName,
          });
        } else {
          onProgress?.(progressPct, `Processing video ${seqPage} of ${totalCount}...`);

          const videoDestFilename = `${uuid}-slide-${pad3}${entry.ext}`;
          const videoDestPath = path.join(videosDir, videoDestFilename);
          await fs.copyFile(entry.fullPath, videoDestPath);

          const webVideoPath = `/uploads/presentations/videos/${videoDestFilename}`;
          const videoType = resolveVideoMimeType(entry.ext);

          await generateVideoPoster(
            videoDestPath,
            slideDestPath,
            tempDir,
            seqPage,
            safeLabel || `Video ${padSeq}`
          );

          const zipOutputName = safeLabel
            ? `${padSeq} - ${safeLabel}${entry.ext}`
            : `${padSeq} - Video ${padSeq}${entry.ext}`;

          sequenceRecords.push({
            page: seqPage,
            kind: "video",
            slideDestPath,
            webImagePath,
            videoUrl: webVideoPath,
            videoType,
            localVideoPath: videoDestPath,
            targetVideoExt: entry.ext,
            zipOutputName,
          });
        }
      }
    } else {
      // =========================================================================
      // PATH B: PPTX or PDF Presentation (with Font Engine + Embedded Media)
      // =========================================================================
      let unpackedDir = "";
      if (ext === ".pptx") {
        onProgress?.(10, "Inspecting presentation for embedded videos & media...");
        unpackedDir = path.join(tempDir, "unpacked");
        await fs.mkdir(unpackedDir, { recursive: true });

        try {
          await execFileAsync("unzip", ["-q", "-o", filePath, "-d", unpackedDir], EXEC_OPTS);

          // Inspect slide relationship files to map embedded videos to exact slide numbers
          const relsDir = path.join(unpackedDir, "ppt", "slides", "_rels");
          const relsFiles = await fs.readdir(relsDir).catch(() => [] as string[]);

          for (const relFile of relsFiles) {
            const match = relFile.match(/^slide(\d+)\.xml\.rels$/);
            if (!match) continue;
            const slideNum = parseInt(match[1], 10);

            const relContent = await fs.readFile(path.join(relsDir, relFile), "utf8");
            const relationshipRegex = /<Relationship\s+[^>]*Target="([^"]+)"[^>]*>/gi;
            let m: RegExpExecArray | null;

            while ((m = relationshipRegex.exec(relContent)) !== null) {
              const target = m[1];
              const targetExt = path.extname(target).toLowerCase();

              if (VIDEO_EXTS.has(targetExt) && target.includes("media/")) {
                const mediaFilename = path.basename(target);
                const sourceMediaPath = path.join(unpackedDir, "ppt", "media", mediaFilename);

                try {
                  const stat = await fs.stat(sourceMediaPath);
                  if (stat.size > 0) {
                    const videoDestFilename = `${uuid}-slide-${String(slideNum).padStart(3, "0")}${targetExt}`;
                    const videoDestPath = path.join(videosDir, videoDestFilename);
                    await fs.copyFile(sourceMediaPath, videoDestPath);

                    const webVideoPath = `/uploads/presentations/videos/${videoDestFilename}`;
                    slideMediaMap.set(slideNum, {
                      videoUrl: webVideoPath,
                      videoType: resolveVideoMimeType(targetExt),
                      localVideoPath: videoDestPath,
                      targetExt,
                    });
                    console.log(
                      `[presentationProcessor] Extracted embedded video for Slide ${slideNum}: ${webVideoPath}`
                    );
                    break;
                  }
                } catch (statErr) {
                  console.warn(`[presentationProcessor] Could not read media file ${sourceMediaPath}:`, statErr);
                }
              }
            }
          }
        } catch (unzipErr) {
          console.error("Failed to unzip PPTX for media inspection:", unzipErr);
        }
      }

      // Dynamic Font Detection & Acquisition before LibreOffice conversion
      onProgress?.(15, "Inspecting typography & acquiring missing presentation fonts...");
      try {
        const pyScript = path.join(process.cwd(), "scripts", "ensure_presentation_fonts.py");
        const scanTarget = unpackedDir || filePath;
        const fontRes = await execFileAsync("python3", [pyScript, scanTarget], {
          ...EXEC_OPTS,
          timeout: 45000,
        });
        const fontData = JSON.parse(fontRes.stdout || "{}");
        if (fontData.downloaded_files?.length > 0) {
          console.log(
            `[presentationProcessor] Auto-downloaded ${fontData.downloaded_files.length} missing font(s):`,
            fontData.downloaded_files
          );
          onProgress?.(18, `Installed ${fontData.downloaded_files.length} presentation font(s)...`);
        }
      } catch (fontErr) {
        console.warn("[presentationProcessor] Font discovery warning:", fontErr);
      }

      if (ext === ".pptx") {
        onProgress?.(20, "Converting presentation to PDF with exact fonts...");
        const loProfileDir = path.join(tempDir, "lo_profile");
        await execFileAsync(
          "soffice",
          [
            `-env:UserInstallation=file://${loProfileDir}`,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            tempDir,
            filePath,
          ],
          { ...EXEC_OPTS, timeout: 180000 }
        );

        const files = await fs.readdir(tempDir);
        const convertedPdfFile = files.find((f) => f.endsWith(".pdf"));
        if (!convertedPdfFile) {
          throw new Error("Presentation conversion failed (PDF not generated)");
        }
        pdfPath = path.join(tempDir, convertedPdfFile);
      }

      // Attempt to extract native text layer from PDF (if file size is < 20MB)
      try {
        const stats = await fs.stat(pdfPath);
        const sizeMB = stats.size / (1024 * 1024);
        if (sizeMB > 20) {
          console.warn(
            `[presentationProcessor] PDF file size is ${sizeMB.toFixed(2)}MB (> 20MB). Skipping native text extraction to prevent OOM.`
          );
        } else {
          onProgress?.(30, "Extracting native sermon text...");
          const pdfBuffer = await fs.readFile(pdfPath);
          const pdfData = await pdfParse(pdfBuffer);
          extractedText = pdfData.text || "";
        }
      } catch (err) {
        console.error("Failed to extract native text:", err);
      }

      // Convert PDF pages to JPEGs using pdftoppm
      onProgress?.(40, "Extracting pages as slide images...");
      const pagePrefix = path.join(tempDir, "page");
      await execFileAsync("pdftoppm", ["-jpeg", "-r", "150", pdfPath, pagePrefix], {
        ...EXEC_OPTS,
        timeout: 180000,
      });

      const tempFiles = await fs.readdir(tempDir);
      const jpegFiles = tempFiles
        .filter((f) => f.startsWith("page-") && f.endsWith(".jpg"))
        .map((f) => {
          const match = f.match(/page-(\d+)\.jpg$/);
          const pageNum = match ? parseInt(match[1], 10) : 0;
          return {
            filename: f,
            pageNum,
            fullPath: path.join(tempDir, f),
          };
        })
        .sort((a, b) => a.pageNum - b.pageNum);

      if (jpegFiles.length === 0) {
        throw new Error("No slide pages could be extracted from the presentation.");
      }

      const padLength = Math.max(2, String(jpegFiles.length).length);

      for (let i = 0; i < jpegFiles.length; i++) {
        const file = jpegFiles[i];
        const pad3 = String(file.pageNum).padStart(3, "0");
        const padSeq = String(file.pageNum).padStart(padLength, "0");
        const slideFilename = `${uuid}-slide-${pad3}.jpg`;
        const slideDestPath = path.join(slidesDir, slideFilename);
        const webImagePath = `/uploads/presentations/slides/${slideFilename}`;
        const media = slideMediaMap.get(file.pageNum);

        const pct = 42 + Math.floor(((i + 1) / jpegFiles.length) * 12);
        onProgress?.(pct, `Optimizing slide ${i + 1} of ${jpegFiles.length}...`);

        await sharp(file.fullPath)
          .resize({
            width: 1920,
            height: 1080,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 80, progressive: true })
          .toFile(slideDestPath);

        const slide = pptx.addSlide();
        slide.addImage({
          path: slideDestPath,
          x: 0,
          y: 0,
          w: 10,
          h: 5.625,
        });

        sequenceRecords.push({
          page: file.pageNum,
          kind: "image",
          ocrSourcePath: slideDestPath,
          slideDestPath,
          webImagePath,
          videoUrl: media ? media.videoUrl : null,
          videoType: media ? media.videoType : null,
          localVideoPath: media ? media.localVideoPath : null,
          targetVideoExt: media ? media.targetExt : undefined,
          zipOutputName: `${padSeq} - Slide ${padSeq}.jpg`,
        });
      }
    }

    // =========================================================================
    // STEP 3.5: Local OCR on Image Slides (when native text is insufficient)
    // =========================================================================
    const textLength = extractedText.replace(/\s+/g, "").length;
    const ocrCandidates = sequenceRecords.filter((r) => r.kind === "image" && r.ocrSourcePath);

    if (textLength < 50 && ocrCandidates.length > 0) {
      onProgress?.(56, "Running local OCR on slide images...");
      let ocrText = "";

      let worker: any = null;
      try {
        worker = await createWorker("eng", 1, {
          workerPath: path.join(
            process.cwd(),
            "node_modules",
            "tesseract.js",
            "src",
            "worker-script",
            "node",
            "index.js"
          ),
          cachePath: path.join(process.cwd(), "tmp"),
        });
      } catch (workerErr) {
        console.error("Failed to create Tesseract worker:", workerErr);
      }

      if (worker) {
        const maxOcrPages = Math.min(ocrCandidates.length, 16);
        for (let i = 0; i < maxOcrPages; i++) {
          const rec = ocrCandidates[i];
          try {
            onProgress?.(
              56 + Math.floor(((i + 1) / maxOcrPages) * 16),
              `Running local OCR on slide ${i + 1} of ${maxOcrPages}...`
            );
            const {
              data: { text },
            } = await worker.recognize(rec.ocrSourcePath!);
            if (text && text.trim()) {
              ocrText += `\n--- Slide ${rec.page} ---\n${text.trim()}\n`;
            }
          } catch (ocrErr) {
            console.error(`OCR failed for slide ${rec.page}:`, ocrErr);
          }
        }
        try {
          await worker.terminate();
        } catch (termErr) {
          console.error("Failed to terminate Tesseract worker:", termErr);
        }
        extractedText = ocrText;
      }
    }

    // =========================================================================
    // STEP 3.6: Generate AI Sermon Commentary from Extracted Text
    // =========================================================================
    let commentary: string | null = null;
    if (extractedText.trim().length > 10) {
      try {
        onProgress?.(75, "Generating AI sermon commentary...");

        const systemPrompt = `You are HGF Connect AI, a devoted pastoral assistant for House of Grace Fellowship.
Analyze the following extracted text from the sermon slides.
Create a beautiful, inspiring, and structured commentary/blog post about this sermon/resources.

Normalize and correct any garbled text or scrambled/reversed letter casing from the input (e.g., if you see "jOHN 3:16" or "thE lamb OF GOD", correct it to "John 3:16" or "The Lamb of God"). Do not propagate messy casing or raw PDF formatting errors into your output.

Provide:
1. Title: An engaging, faith-filled title.
2. Overview: A warm, 2-3 sentence summary of the core message.
3. Key Takeaway Lessons: 3-4 bullet points highlighting the main spiritual lessons.
4. Reflection Questions: 2-3 questions for personal reflection or group study.

FORMAT: Respond in clean, standard Markdown (no JSON wrapper, no markdown code fences like \`\`\`markdown, just the raw markdown content directly).
Keep the tone encouraging, warm, and faith-based (in standard English, but friendly to a Filipino church audience).`;

        const prompt = `Extracted Sermon Content:\n"${extractedText}"`;

        const rawReply = await callOpenAI({
          systemPrompt,
          userPrompt: prompt,
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          temperature: 0.7,
          timeoutMs: 30000,
        });

        if (rawReply) {
          commentary = rawReply.replace(/```markdown\n?|```html\n?|```\n?/g, "").trim();
        }
      } catch (err) {
        console.error("Failed to generate AI commentary:", err);
      }
    }

    // =========================================================================
    // STEP 4 & 5: Build SlideItems + Sequenced ProPresenter 7 ZIP Package
    // =========================================================================
    onProgress?.(90, "Packaging sequenced slides & media into ProPresenter 7 ZIP...");

    const zipStageDir = path.join(tempDir, "zip_package");
    await fs.mkdir(zipStageDir, { recursive: true });

    const padLength = Math.max(2, String(sequenceRecords.length).length);
    const slideItems: SlideItem[] = [];
    const orderedZipTargets: string[] = [];

    for (const rec of sequenceRecords) {
      slideItems.push({
        image: rec.webImagePath,
        video: rec.videoUrl,
        videoType: rec.videoType,
        page: rec.page,
      });

      if (rec.kind === "video" && rec.localVideoPath) {
        // Standalone video item in a hybrid ZIP: place ONLY the numbered video at its exact slot
        await fs.copyFile(rec.localVideoPath, path.join(zipStageDir, rec.zipOutputName));
        orderedZipTargets.push(rec.zipOutputName);
      } else {
        // Image slide: copy the numbered optimized JPEG
        await fs.copyFile(rec.slideDestPath, path.join(zipStageDir, rec.zipOutputName));
        orderedZipTargets.push(rec.zipOutputName);

        // If a PPTX slide ALSO had an embedded video on that same slide, place it right next to the slide
        if (rec.localVideoPath && rec.targetVideoExt) {
          const padSeq = String(rec.page).padStart(padLength, "0");
          const zipVideoName = `${padSeq} - Slide ${padSeq} (Video)${rec.targetVideoExt}`;
          try {
            await fs.copyFile(rec.localVideoPath, path.join(zipStageDir, zipVideoName));
            orderedZipTargets.push(zipVideoName);
          } catch (copyErr) {
            console.warn("Could not copy embedded PPTX video to zip package:", copyErr);
          }
        }
      }
    }

    // For PPTX/PDF uploads, preserve the original/companion deck inside a _Source_Deck subfolder
    // so the root folder stays 100% clean and sequential for ProPresenter drag-and-drop.
    // (For ZIP uploads, we intentionally DO NOT duplicate the raw uploaded ZIP inside the output ZIP.)
    if (!isZip) {
      const sourceSubdir = path.join(zipStageDir, "_Source_Deck");
      await fs.mkdir(sourceSubdir, { recursive: true });

      const safeOriginalName =
        originalName.replace(/[/\\:*?"<>|]/g, "_").trim() || `Original_Presentation${ext}`;
      await fs.copyFile(filePath, path.join(sourceSubdir, safeOriginalName));
      orderedZipTargets.push("_Source_Deck");

      if (ext === ".pdf") {
        try {
          const generatedPptxName = `${originalName.replace(/\.[^/.]+$/, "")}.pptx`.replace(
            /[/\\:*?"<>|]/g,
            "_"
          );
          const generatedPptxPath = path.join(tempDir, "generated.pptx");
          await pptx.writeFile({ fileName: generatedPptxPath });
          await fs.copyFile(generatedPptxPath, path.join(sourceSubdir, generatedPptxName));
        } catch (genErr) {
          console.warn("Could not generate PPTX companion for PDF:", genErr);
        }
      } else if (ext === ".pptx") {
        try {
          await fs.copyFile(filePath, path.join(uploadDir, `${uuid}.pptx`));
        } catch {}
      }
    }

    const finalZipFilename = `${uuid}.zip`;
    const finalZipPath = path.join(uploadDir, finalZipFilename);

    onProgress?.(96, "Finalizing ZIP archive...");
    // Store pre-compressed media (.mp4, .mov, .jpg, etc.) in exact sequential entry order
    await execFileAsync(
      "zip",
      [
        "-q",
        "-r",
        "-n",
        ".mp4:.mov:.webm:.m4v:.avi:.mkv:.jpg:.jpeg:.png:.webp:.pptx:.zip",
        finalZipPath,
        ...orderedZipTargets,
      ],
      { ...EXEC_OPTS, cwd: zipStageDir, timeout: 120000 }
    );

    const baseNameWithoutExt =
      originalName.replace(/\.[^/.]+$/, "").trim() || "Sermon Presentation";
    const finalOriginalName = `${baseNameWithoutExt}.zip`;

    onProgress?.(100, "Packaging complete!");
    return {
      presentationFile: `/uploads/presentations/${finalZipFilename}`,
      presentationOriginalName: finalOriginalName,
      presentationSlides: slideItems,
      commentary,
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      await fs.unlink(filePath).catch(() => {});
    } catch (cleanupErr) {
      console.error("Cleanup error in presentationProcessor:", cleanupErr);
    }
  }
}
