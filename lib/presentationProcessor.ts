import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import pptxgen from "pptxgenjs";
import { randomUUID } from "crypto";
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";
import { callOpenAI } from "./ai";

const execAsync = promisify(exec);

export interface ProcessedPresentation {
  presentationFile: string;
  presentationOriginalName: string;
  presentationSlides: string[];
  commentary?: string | null;
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

  // Create necessary directories
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.mkdir(slidesDir, { recursive: true });

  const ext = path.extname(filePath).toLowerCase();
  const finalFilename = `${uuid}${ext}`;
  const finalDestPath = path.join(uploadDir, finalFilename);
  await fs.copyFile(filePath, finalDestPath);

  let pdfPath = filePath;

  try {
    // 1. If it's a PPTX file, convert it to PDF first using headless LibreOffice
    if (ext === ".pptx") {
      onProgress?.(15, "Converting presentation to PDF...");
      await execAsync(
        `soffice --headless --convert-to pdf --outdir "${tempDir}" "${filePath}"`
      );

      // Find the converted PDF
      const files = await fs.readdir(tempDir);
      const convertedPdfFile = files.find((f) => f.endsWith(".pdf"));
      if (!convertedPdfFile) {
        throw new Error("Presentation conversion failed (PDF not generated)");
      }
      pdfPath = path.join(tempDir, convertedPdfFile);
    }

    // 1.5 Attempt to extract native text layer from PDF (if file size is < 20MB)
    let extractedText = "";
    try {
      const stats = await fs.stat(pdfPath);
      const sizeMB = stats.size / (1024 * 1024);
      if (sizeMB > 20) {
        console.warn(`[presentationProcessor] PDF file size is ${sizeMB.toFixed(2)}MB (> 20MB). Skipping native text extraction to prevent OOM.`);
      } else {
        onProgress?.(25, "Extracting native sermon text...");
        const pdfBuffer = await fs.readFile(pdfPath);
        const pdfData = await pdfParse(pdfBuffer);
        extractedText = pdfData.text || "";
      }
    } catch (err) {
      console.error("Failed to extract native text:", err);
    }

    // 2. Convert PDF pages to JPEGs using pdftoppm
    onProgress?.(35, "Extracting pages as slide images...");
    const pagePrefix = path.join(tempDir, "page");
    await execAsync(`pdftoppm -jpeg -r 150 "${pdfPath}" "${pagePrefix}"`);

    // 3. Read extracted page JPEGs
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
      });

    if (jpegFiles.length === 0) {
      throw new Error("No slide pages could be extracted from the presentation.");
    }

    // Sort files numerically by page number
    jpegFiles.sort((a, b) => a.pageNum - b.pageNum);

    // 3.5 Perform local OCR if native text is insufficient (flattened slide deck)
    const textLength = extractedText.replace(/\s+/g, "").length;
    if (textLength < 50) {
      onProgress?.(45, "Native text layer insufficient. Performing local OCR on slide images...");
      let ocrText = "";

      let worker: any = null;
      try {
        worker = await createWorker("eng", 1, {
          workerPath: path.join(process.cwd(), "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js"),
          cachePath: path.join(process.cwd(), "tmp")
        });
      } catch (workerErr) {
        console.error("Failed to create Tesseract worker:", workerErr);
      }

      if (worker) {
        // Limit OCR to first 16 pages to prevent process timeouts on large slide decks
        const maxOcrPages = Math.min(jpegFiles.length, 16);
        for (let i = 0; i < maxOcrPages; i++) {
          const file = jpegFiles[i];
          try {
            onProgress?.(
              45 + Math.floor((i / maxOcrPages) * 15),
              `Running local OCR on slide ${i + 1} of ${maxOcrPages}...`
            );
            const { data: { text } } = await worker.recognize(file.fullPath);
            if (text && text.trim()) {
              ocrText += `\n--- Slide ${i + 1} ---\n${text.trim()}\n`;
            }
          } catch (ocrErr) {
            console.error(`OCR failed for slide ${i + 1}:`, ocrErr);
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

    // 3.6 Generate AI commentary using extracted text
    let commentary: string | null = null;
    if (extractedText.trim().length > 10) {
      try {
        onProgress?.(65, "Generating AI sermon commentary...");
        
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

    const slidePaths: string[] = [];
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_16x9";

    // 4. Optimize each slide JPEG using sharp and add to PPTX slides
    let idx = 0;
    for (const file of jpegFiles) {
      idx++;
      const percent = Math.floor(45 + (idx / jpegFiles.length) * 45);
      onProgress?.(percent, `Compressing & optimizing slide ${idx} of ${jpegFiles.length}...`);

      const slideFilename = `${uuid}-slide-${String(file.pageNum).padStart(3, "0")}.jpg`;
      const slideDestPath = path.join(slidesDir, slideFilename);

      // Optimize and flatten image to standard widescreen bounds (1920x1080)
      await sharp(file.fullPath)
        .resize({
          width: 1920,
          height: 1080,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, progressive: true })
        .toFile(slideDestPath);

      // Add to PPTX slide
      const slide = pptx.addSlide();
      slide.addImage({
        path: slideDestPath,
        x: 0,
        y: 0,
        w: 10,
        h: 5.625,
      });

      slidePaths.push(`/uploads/presentations/slides/${slideFilename}`);
    }

    onProgress?.(100, "Optimization complete!");
    return {
      presentationFile: `/uploads/presentations/${finalFilename}`,
      presentationOriginalName: originalName,
      presentationSlides: slidePaths,
      commentary,
    };
  } finally {
    // 6. Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      await fs.unlink(filePath).catch(() => {});
    } catch (cleanupErr) {
      console.error("Cleanup error in presentationProcessor:", cleanupErr);
    }
  }
}
