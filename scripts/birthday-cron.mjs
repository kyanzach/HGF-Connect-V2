/**
 * scripts/birthday-cron.mjs — Secure Birthday Auto-Announcer
 *
 * Designed to be executed daily via crontab:
 *   0 23 * * * node /var/www/hgf-connect/scripts/birthday-cron.mjs
 *
 * Runs standalone without external dependencies.
 */

import fs from "fs";
import path from "path";

// ── Manual .env parser (keeps script zero-dependency) ──
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
        // Strip quotes if present
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn("[birthday-cron] Failed to read environment file:", e?.message);
}

const secret = process.env.CRON_SECRET;
const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

if (!secret) {
  console.error("[birthday-cron] CRON_SECRET environment variable is missing.");
  process.exit(1);
}

async function triggerBirthdayCheck() {
  console.log(`[birthday-cron] Triggering birthday check at ${baseUrl}...`);
  try {
    const res = await fetch(`${baseUrl}/api/birthdays/check`, {
      method: "POST",
      headers: {
        "x-cron-secret": secret,
      },
    });

    const data = await res.json();
    if (res.ok) {
      console.log("[birthday-cron] Success:", data);
    } else {
      console.error("[birthday-cron] Failed:", res.status, data);
    }
  } catch (error) {
    console.error("[birthday-cron] Network/execution error:", error?.message || error);
  }
}

triggerBirthdayCheck();
