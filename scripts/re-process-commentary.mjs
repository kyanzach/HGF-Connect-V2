import fs from "fs";
import path from "path";
import axios from "axios";
import Tesseract from "tesseract.js";

// Load .env variables manually for API keys
try {
  const envFile = fs.readFileSync(".env", "utf8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[key] = val;
    }
  }
} catch (e) {
  console.log("No .env file found or failed to parse, relying on process.env");
}

const slidePrefix = "2004f2a6-2d25-415c-9084-6e8e01e3053a";
const totalSlides = 15;
const eventId = 66;

async function main() {
  console.log(`Starting local OCR process for slide prefix: ${slidePrefix}...`);

  let ocrText = "";
  for (let i = 1; i <= totalSlides; i++) {
    const slideFilename = `${slidePrefix}-slide-${String(i).padStart(3, "0")}.jpg`;
    const localPath = path.join(process.cwd(), "public", "uploads", "presentations", "slides", slideFilename);
    
    console.log(`OCR Slide ${i}/${totalSlides}: ${localPath}`);
    if (!fs.existsSync(localPath)) {
      console.warn(`File does not exist: ${localPath}`);
      continue;
    }

    try {
      const { data: { text } } = await Tesseract.recognize(localPath, "eng");
      if (text && text.trim()) {
        console.log(`  Extracted ${text.trim().split("\n").length} lines.`);
        ocrText += `\n--- Slide ${i} ---\n${text.trim()}\n`;
      }
    } catch (err) {
      console.error(`  OCR failed for slide ${i}:`, err);
    }
  }

  console.log("\n=== MERGED OCR TEXT ===");
  console.log(ocrText);

  if (!ocrText.trim()) {
    console.error("No text extracted from slides.");
    return;
  }

  console.log("\nCalling Straico API to generate accurate commentary...");
  const systemPrompt = `You are HGF Connect AI, a devoted pastoral assistant for House of Grace Fellowship.
Analyze the following extracted text from the sermon slides.
Create a beautiful, inspiring, and structured commentary/blog post about this sermon/resources.

Provide:
1. Title: An engaging, faith-filled title (should relate to the sermon topic "Building Unshakable Life" / foundation).
2. Overview: A warm, 2-3 sentence summary of the core message (specifically mention the engineering verdict of the 9-story building collapse, shallow vs deep foundations, and building on the Rock of Jesus Christ instead of sand).
3. Key Takeaway Lessons: 3-4 bullet points highlighting the main spiritual lessons (focusing on foundations, sand vs rock, storms, and real-life sand like success, relationships, and money).
4. Reflection Questions: 2-3 questions for personal reflection or group study.

FORMAT: Respond in clean, standard Markdown (no JSON wrapper, no markdown code fences like \`\`\`markdown, just the raw markdown content directly).
Keep the tone encouraging, warm, and faith-based (in standard English, but friendly to a Filipino church audience).`;

  const prompt = `Extracted Sermon Content:\n"${ocrText}"`;
  const openAiModel = (process.env.OPENAI_MODEL || process.env.STRAICO_MODEL || "gpt-4o-mini").replace(/^openai\//i, "");
  const apiKey = process.env.OPENAI_API_KEY || process.env.STRAICO_API_KEY;

  if (!apiKey) {
    console.error("OPENAI_API_KEY is not defined in the environment.");
    return;
  }

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: openAiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const rawReply = response.data?.choices?.[0]?.message?.content || "";

  if (!rawReply) {
    console.error("No reply received from OpenAI.");
    return;
  }

  const commentary = rawReply.replace(/```markdown\n?|```html\n?|```\n?/g, "").trim();

  console.log("\n=== GENERATED COMMENTARY ===");
  console.log(commentary);

  // Escaping single quotes for MySQL
  const escapedCommentary = commentary.replace(/'/g, "''");
  const sql = `UPDATE events SET commentary = '${escapedCommentary}' WHERE id = ${eventId};\n`;

  const scratchDir = path.join(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const sqlPath = path.join(scratchDir, "update-commentary.sql");
  fs.writeFileSync(sqlPath, sql, "utf8");
  console.log(`\nSuccessfully wrote SQL update script to: ${sqlPath}`);
}

main().catch(console.error);
