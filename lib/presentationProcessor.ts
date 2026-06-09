import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import pptxgen from "pptxgenjs";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

export interface ProcessedPresentation {
  presentationFile: string;
  presentationOriginalName: string;
  presentationSlides: string[];
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
  let pdfPath = filePath;

  try {
    // 1. If it's a PPTX file, convert it to PDF first using headless LibreOffice
    if (ext === ".pptx") {
      onProgress?.(15, "Converting presentation to PDF...");
      const tempPdfName = `converted-${uuid}.pdf`;
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

    // 2. Convert PDF pages to JPEGs using pdftoppm
    onProgress?.(40, "Extracting pages as slide images...");
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

    const slidePaths: string[] = [];
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_16x9";

    // 4. Optimize each slide JPEG using sharp and add to PPTX slides
    let idx = 0;
    for (const file of jpegFiles) {
      idx++;
      const percent = Math.floor(40 + (idx / jpegFiles.length) * 45);
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

    // 5. Compile the new optimized PPTX presentation
    onProgress?.(90, "Compiling final compressed slide deck...");
    const pptxFilename = `${uuid}-compressed.pptx`;
    const pptxDestPath = path.join(uploadDir, pptxFilename);
    await pptx.writeFile({ fileName: pptxDestPath });

    onProgress?.(100, "Optimization complete!");
    return {
      presentationFile: `/uploads/presentations/${pptxFilename}`,
      presentationOriginalName: originalName,
      presentationSlides: slidePaths,
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
