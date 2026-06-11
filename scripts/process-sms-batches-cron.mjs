import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple env loader
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '../.env.production'),
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = match[2] || '';
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
          } else if (val.startsWith("'") && val.endsWith("'")) {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val.trim();
        }
      });
      console.log(`Loaded environment from ${path.basename(envPath)}`);
      break;
    }
  }
}

loadEnv();

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret) {
  console.error("Error: CRON_SECRET is not defined in the environment.");
  process.exit(1);
}

const targetUrl = `${appUrl.replace(/\/$/, '')}/api/sms/batches/process`;
console.log(`[Batch Processor Cron] Triggering API endpoint: ${targetUrl}`);

async function run() {
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret
      }
    });

    const data = await res.json();
    console.log(`[Batch Processor Cron] Response Status: ${res.status}`);
    console.log(`[Batch Processor Cron] Response Body:`, JSON.stringify(data, null, 2));

    if (!res.ok || data.error) {
      console.error("[Batch Processor Cron] Failed to trigger batch processor.");
      process.exit(1);
    }
  } catch (error) {
    console.error(`[Batch Processor Cron] Network/Connection Error:`, error.message);
    process.exit(1);
  }
}

run();
