/**
 * scripts/sunday-quiz-cron.mjs — Instant Sunday 12:00 PM Quiz Auto-Generator
 *
 * Designed to be executed via system cron every Sunday at 12:00 PM Manila time (04:00 UTC):
 *   0 4 * * 0 cd /var/www/hgf-connect && node scripts/sunday-quiz-cron.mjs >> /var/www/hgf-connect/sunday-quiz-cron.log 2>&1
 *
 * Runs standalone without external dependencies.
 */

import fs from "fs";
import path from "path";

try {
  let envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    envPath = path.resolve(process.cwd(), ".env.production");
  }
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn("[sunday-quiz-cron] Failed to read environment file:", e?.message);
}

const secret = process.env.CRON_SECRET;
const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

if (!secret) {
  console.error("[sunday-quiz-cron] CRON_SECRET environment variable is missing.");
  process.exit(1);
}

(async () => {
  const ts = new Date().toISOString();
  console.log(`[sunday-quiz-cron] [${ts}] Starting Sunday 12:00 PM quiz run...`);

  try {
    // 1. Archive any expired quiz first
    const acRes = await fetch(`${baseUrl}/api/quiz/auto-complete`, {
      method: "POST",
      headers: { "x-cron-secret": secret },
    });
    const acData = await acRes.json().catch(() => ({}));
    console.log("[sunday-quiz-cron] auto-complete:", acRes.status, acData);

    // 2. Auto-generate & publish today's Sunday quiz (no YouTube video required)
    const genRes = await fetch(`${baseUrl}/api/quiz/auto-generate-sunday`, {
      method: "POST",
      headers: {
        "x-cron-secret": secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const genData = await genRes.json().catch(() => ({}));
    if (genRes.ok) {
      console.log("[sunday-quiz-cron] auto-generate-sunday:", genData);
    } else {
      console.error("[sunday-quiz-cron] auto-generate-sunday failed:", genRes.status, genData);
    }
  } catch (error) {
    console.error("[sunday-quiz-cron] Execution error:", error);
  }
})();
