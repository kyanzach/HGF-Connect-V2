# HGF Connect App — Expert Consultant Guide
## AI Chatbot (Straico) & Biometric Login (WebAuthn)

> This guide is written by an experienced consultant who has shipped both of these features  
> in production. Follow these patterns exactly — they encode real lessons from real bugs.

---

## PART 1 — Straico AI Chatbot

### What Straico Is

Straico is a **multi-model AI API gateway**. You send one request and it routes to OpenAI, Anthropic, Google, Mistral, or any other model you choose — all through one key, one endpoint, cheaper credits than direct OpenAI.

**Best model for a church app:** `openai/gpt-4o-mini` — fast, cheap, very capable. Upgrade to `openai/gpt-4o` or `anthropic/claude-3-sonnet` only if you need deeper reasoning.

---

### 1.1 The API — Critical Differences from OpenAI

```
POST https://api.straico.com/v1/prompt/completion
Headers:
  Authorization: Bearer {STRAICO_API_KEY}
  Content-Type: application/json
```

**Straico body format:**
```json
{
  "models": ["openai/gpt-4o-mini"],
  "message": "Your entire prompt as a single string"
}
```

**This is NOT like OpenAI.** OpenAI uses a `messages` array with roles. Straico uses a **single flat string** in `message`. You concatenate your system prompt + user question into one big string.

```js
// CORRECT — one string for everything
const prompt = `${systemPrompt}\n\nUser asks: "${userMessage}"`;

await axios.post('https://api.straico.com/v1/prompt/completion', {
  models: [process.env.STRAICO_MODEL],
  message: prompt,
}, { headers: { Authorization: `Bearer ${process.env.STRAICO_API_KEY}` }, timeout: 20000 });
```

---

### 1.2 Response Extraction — Always Use Fallbacks

The response is deeply nested. Use all three paths because Straico has changed its format across versions:

```js
const completions = response.data?.data?.completions;
const model = process.env.STRAICO_MODEL; // e.g. 'openai/gpt-4o-mini'

let reply = completions?.[model]?.completion?.choices?.[0]?.message?.content || '';

// Fallbacks (Straico has changed format in past — be defensive)
if (!reply) {
  reply = response.data?.completion?.choices?.[0]?.message?.content
       || response.data?.data?.completion?.choices?.[0]?.message?.content
       || '';
}

// Always return a graceful message — never a 500 error from the chat endpoint
if (!reply) {
  return res.json({ reply: "I'm having trouble right now. Please try again in a moment. 🙏" });
}
```

---

### 1.3 System Prompt Structure (Scoped AI)

For a church app, the AI should ONLY answer about church topics. Use this prompt structure:

```js
const systemPrompt = `
You are [App Name] AI, a helpful assistant for House of Grace church members.

YOUR STRICT SCOPE — you ONLY answer about:
1. Church events, schedules, and announcements
2. Cell group information
3. Church services (worship schedule, locations, prayer)
4. Member's own data provided in "MEMBER PROFILE" below
5. Biblical encouragement and prayer

If asked about ANYTHING outside this scope (other organizations, general AI, politics, personal advice unrelated to church life), respond with:
"I'm your HGF Connect assistant — I can only help with church-related questions. Try asking about events, cell groups, or prayer! 🙏"

PERSONALITY: Warm, encouraging, faith-based, Filipino-friendly English.

MEMBER PROFILE:
- Name: ${memberName}
- Cell Group: ${cellGroup}
- [Any other relevant live data]

KNOWLEDGE BASE:
${churchKnowledgeText}

Answer helpfully and concisely (max 3 paragraphs).`;
```

---

### 1.4 Knowledge Base Strategy

Store your knowledge in a JSON file:
```json
{
  "categories": [
    {
      "id": "worship",
      "label": "Worship Services",
      "articles": [
        { "title": "Sunday Schedule", "content": "Service 1: 7AM, Service 2: 9AM..." }
      ]
    }
  ]
}
```

Load it at **module startup**, not per request:
```js
// Load once when the server starts — require() caches it
let churchKnowledgeText = '';
try {
  const kb = require('./data/church_knowledge.json');
  kb.categories.forEach(cat => {
    churchKnowledgeText += `\n\n=== ${cat.label} ===\n`;
    cat.articles.forEach(a => {
      churchKnowledgeText += `\n[${a.title}]\n${a.content}\n`;
    });
  });
} catch {
  churchKnowledgeText = `House of Grace: Sunday services at 7AM and 9AM. Cell groups meet weekly.`;
}
```

---

### 1.5 Environment Variables

```bash
STRAICO_API_KEY=straico-...
STRAICO_MODEL=openai/gpt-4o-mini
```

---

### 1.6 Things to AVOID — Straico

| ❌ AVOID | ✅ DO INSTEAD |
|---------|--------------|
| Using OpenAI `messages: [...]` array format | Use `message: "..."` single string |
| Hardcoding the model ID in response extraction | Use `completions[process.env.STRAICO_MODEL]` |
| Setting timeout < 15 seconds | Use `timeout: 20000` — Straico can be slow |
| Throwing a 500 error from chat endpoint | Always return `res.json({ reply: "..." })` |
| Re-loading knowledge JSON per request | Load with `require()` at module startup (cached) |
| Using `||` for zero-value context fields | Use `??` — `|| 0` treats `0` as falsy |
| No scope enforcement in system prompt | Give explicit scope + off-topic deflection |
| Relying on one response extraction path | Always have 3 fallback extraction paths |

---

### 1.7 Chat UI Best Practices

#### ✅ 3-Row Scrolling Suggestion Chips (Slow, Correct)

This is the most-asked-about part. Here is the **production-verified exact implementation**.

**The problem with 2 rows / fast scrolling:**
- Using `animation-duration` of `10–20s` is too fast on mobile
- The common mistake is splitting chips into only 2 rows
- Rows that all scroll left look boring — alternate directions!

**Complete chip implementation (React + Tailwind):**

```jsx
// 1. Define your chips (10 minimum for good density after duplication)
const SUGGESTION_CHIPS = [
  { emoji: '🙏', text: "What are the prayer schedules?" },
  { emoji: '📖', text: "Tell me about cell groups" },
  { emoji: '🎵', text: "When is praise and worship?" },
  { emoji: '📅', text: "What events are coming up?" },
  { emoji: '💒', text: "Sunday service times?" },
  { emoji: '🌱', text: "How do I join a cell group?" },
  { emoji: '🤝', text: "How do I volunteer?" },
  { emoji: '📍', text: "Where is the church located?" },
  { emoji: '💬', text: "I need prayer support" },
  { emoji: '📢', text: "Latest church announcements" },
];

// 2. Split into 3 rows of ~4 chips each (can overlap middle row)
const rows = [
  SUGGESTION_CHIPS.slice(0, 4),   // Row 1 — scrolls LEFT
  SUGGESTION_CHIPS.slice(3, 7),   // Row 2 — scrolls RIGHT (1 chip overlap is fine)
  SUGGESTION_CHIPS.slice(6, 10),  // Row 3 — scrolls LEFT
];

// 3. Render
<div className="space-y-2.5 mb-4 overflow-hidden">
  {rows.map((row, rowIdx) => (
    <div key={rowIdx} className="overflow-x-auto scrollbar-none -mx-4 px-4">
      <div
        className="flex gap-2.5 w-max"
        style={{
          // KEY: alternate left/right. Even rows go left, odd rows go right.
          // SLOW: use 40-60 seconds. 48s for row 0, 56s for row 1, 64s for row 2.
          animation: `chipScroll${rowIdx % 2 === 0 ? 'Left' : 'Right'} ${
            48 + rowIdx * 8
          }s linear infinite`,
        }}
        // Pause on hover/touch so user can tap without the row moving
        onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
        onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
        onTouchStart={e => (e.currentTarget.style.animationPlayState = 'paused')}
        onTouchEnd={e => (e.currentTarget.style.animationPlayState = 'running')}
      >
        {/* CRITICAL: duplicate the row so the loop is seamless */}
        {[...row, ...row].map((chip, i) => (
          <button
            key={i}
            onClick={() => sendMessage(`${chip.emoji} ${chip.text}`)}
            disabled={loading}  // disable while AI is thinking
            className="shrink-0 flex items-center gap-2 px-4 py-2.5
                       bg-white border border-gray-200 rounded-2xl text-sm font-medium
                       text-gray-700 hover:border-blue-400 hover:text-blue-600
                       active:scale-95 transition-all shadow-sm whitespace-nowrap
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-base">{chip.emoji}</span>
            <span>{chip.text}</span>
          </button>
        ))}
      </div>
    </div>
  ))}
</div>

{/* 4. CSS animations — put in a <style> tag or your CSS file */}
<style>{`
  /* LEFT: start at 0, end at -50% (seamless because row is duplicated) */
  @keyframes chipScrollLeft {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  /* RIGHT: start at -50%, end at 0 (runs the same loop in reverse) */
  @keyframes chipScrollRight {
    0%   { transform: translateX(-50%); }
    100% { transform: translateX(0); }
  }
  .scrollbar-none::-webkit-scrollbar { display: none; }
  .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
`}</style>
```

**Speed tuning:**
- Row 0: `48s` (slowest feel, most visible)
- Row 1: `56s` (slightly different speed looks natural)
- Row 2: `64s` (even slower, adds depth)
- **Never go below `30s`** — it will look like a slot machine, not a suggestion row

---

**Typing indicator — 3-dot bounce:**
```jsx
<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
```

**Auto-scroll to bottom:**
```js
const bottomRef = useRef(null);
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, loading]); // Trigger on BOTH new messages and loading state change
```

**`whitespace-pre-line` on message bubbles** — AI responses often have newlines.

**Page height for chat** (fills between header and bottom nav):
```jsx
<div className="flex flex-col h-[calc(100vh-56px-64px)]">
  {/* header 56px, bottom dock 64px */}
```

---

---

## PART 2 — WebAuthn Biometric Login (Passkeys)

### What WebAuthn Is

The Web Authentication API (WebAuthn) allows users to log in using device biometrics — Face ID, Touch ID, fingerprint, or Windows Hello — without passwords or OTPs. The device holds a private key (in hardware Secure Enclave/TPM). The server holds the public key. Login = the device signs a challenge with the private key.

**Library to use (both packages MUST be same major version):**
```bash
# Client
npm install @simplewebauthn/browser@^9

# Server
npm install @simplewebauthn/server@^9
```

---

### 2.1 The Two Flows

**A. Registration (Enrollment) — user must already be logged in:**
```
1. Server: generateRegistrationOptions() → sends challenge + RP config
2. Client: startRegistration({ optionsJSON }) → triggers Face ID / Touch ID prompt
3. User verifies biometric → device creates key pair
4. Client: sends credential (public key + attestation) to server
5. Server: verifyRegistrationResponse() → stores credential_id + public_key in DB
6. Client: localStorage.setItem('biometric-enrolled', { [userId]: true })
```

**B. Authentication (Login) — before the user is logged in:**
```
1. Server: generateAuthenticationOptions() → sends challenge + known credential IDs
2. Client: startAuthentication({ optionsJSON }) → triggers Face ID / Touch ID prompt
3. User verifies biometric → device signs challenge
4. Client: sends signed assertion to server
5. Server: verifyAuthenticationResponse() → signature valid → issues JWT
6. Client: store JWT, navigate to home
```

---

### 2.2 Backend — 5 Endpoints Needed

```js
// No auth required (user not logged in yet)
POST /auth/webauthn/login-options    // Returns challenge for a given identifier (phone/email)
POST /auth/webauthn/login-verify     // Verifies signature, returns JWT
GET  /auth/webauthn/has-credentials  // Check if user has enrolled creds

// Requires auth (user must be logged in via OTP/password first)
POST /auth/webauthn/register-options  // Returns challenge for enrollment
POST /auth/webauthn/register-verify   // Stores public key credential
```

---

### 2.3 Database Schema

```sql
CREATE TABLE webauthn_credentials (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  credential_id VARCHAR(512) NOT NULL UNIQUE,  -- base64url, can be LONG (iCloud keys)
  public_key    TEXT NOT NULL,                   -- base64url encoded
  counter       BIGINT NOT NULL DEFAULT 0,       -- replay attack prevention
  device_name   VARCHAR(255),                    -- "Touch ID", "Face ID", etc.
  transports    JSON,                            -- ["internal"] for device biometrics
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

> ⚠️ Use `VARCHAR(512)` NOT `VARCHAR(255)` for `credential_id` — iCloud Keychain credentials exceed 255 chars.

---

### 2.4 Server Configuration

```js
const RP_NAME = 'HGF Connect';                         // App name shown in biometric prompt
const RP_ID = process.env.WEBAUTHN_RP_ID;              // Your domain, no protocol, no slash
const ORIGIN = process.env.WEBAUTHN_ORIGIN;            // Full origin with protocol
```

```bash
# .env — production
WEBAUTHN_RP_ID=hgfconnect.com
WEBAUTHN_ORIGIN=https://hgfconnect.com

# .env.local — development
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
```

> ⚠️ **RP_ID is the most critical config.** If it doesn't match the domain exactly, EVERY verification will fail with `InvalidRPID`. No protocol. No path. No trailing slash. Just the bare domain.

---

### 2.5 Challenge Store

Challenges are one-time-use, short-lived. Use in-memory for single server, Redis for multi-server:

```js
const challengeStore = new Map();

function storeChallenge(userId, challenge) {
  challengeStore.set(String(userId), {
    challenge,
    expires: Date.now() + 5 * 60 * 1000  // 5 minutes
  });
}

function getChallenge(userId) {
  const entry = challengeStore.get(String(userId));
  if (!entry || Date.now() > entry.expires) {
    challengeStore.delete(String(userId));
    return null;  // Expired — user must retry
  }
  return entry.challenge;
}

function clearChallenge(userId) {
  challengeStore.delete(String(userId));  // Clear immediately after use
}
```

---

### 2.6 Registration Options

```js
const options = await generateRegistrationOptions({
  rpName: RP_NAME,
  rpID: RP_ID,
  userName: user.phone || user.email,         // Shown in OS biometric prompt
  userDisplayName: user.full_name,
  userID: new TextEncoder().encode(String(userId)),  // MUST be Uint8Array
  attestationType: 'none',
  authenticatorSelection: {
    authenticatorAttachment: 'platform',   // 'platform' = device biometrics ONLY
                                           // 'cross-platform' = hardware keys (YubiKey etc)
    userVerification: 'required',          // Must verify biometric, not just tap
    residentKey: 'preferred',
  },
  excludeCredentials: existingCreds.map(c => ({ id: c.credential_id })),
});
```

---

### 2.7 Critical Key Conversions

When storing the public key from registration:
```js
// Store: Buffer → base64url string
public_key: isoBase64URL.fromBuffer(regCred.publicKey)
```

When reading back for authentication verification:
```js
// Read: base64url string → Buffer
credential: {
  id: storedCred.credential_id,
  publicKey: isoBase64URL.toBuffer(storedCred.public_key),  // Convert back!
  counter: storedCred.counter,
}
```

> ⚠️ Forgetting `isoBase64URL.toBuffer()` on the read causes silent verification failure — `verified: false` with no obvious error message.

---

### 2.8 Frontend — Enrollment State

Track enrollment state in `localStorage`:

```js
// After successful registration:
const enrolled = JSON.parse(localStorage.getItem('biometric-enrolled') || '{}');
enrolled[userId] = true;
localStorage.setItem('biometric-enrolled', JSON.stringify(enrolled));

// On login page load — check if this device has enrolled biometrics:
const enrolled = JSON.parse(localStorage.getItem('biometric-enrolled') || '{}');
const hasLocalEnrollment = !!enrolled[userId];
```

**Cross-device fallback** — check server if not enrolled locally:
```js
// If user enrolled on phone, their laptop won't have the localStorage flag
// So also check the server when they type their identifier:
const { hasCredentials } = await fetch(`/api/auth/webauthn/has-credentials?phone=${phone}`).then(r => r.json());
if (hasCredentials) setShowBiometricButton(true);
```

---

### 2.9 Error Handling on Enrollment

```js
try {
  await registerBiometric(token);
  setEnrolled(userId);
} catch (err) {
  if (err.name === 'InvalidStateError') {
    // Credential already exists on device (e.g. synced via iCloud Keychain)
    // ← This is SUCCESS, not failure. Mark as enrolled.
    setEnrolled(userId);
  } else if (err.name === 'NotAllowedError') {
    // User cancelled or denied the biometric prompt
    showError('Biometric was cancelled. You can try again later.');
  } else {
    showError('Could not enable biometric login. Try again.');
  }
}
```

---

### 2.10 When to Show Enrollment

Show the enrollment modal **after successful login** (OTP or password), **not before**:
- Check: [isWebAuthnSupported() && !isEnrolled(userId) && !isDismissed()](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/client/src/services/webauthnService.js#5-12)
- Delay showing by 800ms so the navigation to home completes first
- Show "Not now" button — user should never be forced to enroll
- Remember dismissal for 24 hours:

```js
function dismissEnrollment() {
  localStorage.setItem('biometric-dismissed', Date.now().toString());
}

function isDismissed() {
  const t = localStorage.getItem('biometric-dismissed');
  return t && (Date.now() - parseInt(t) < 24 * 60 * 60 * 1000);
}
```

---

### 2.11 Platform Behavior Matrix

| Platform | Biometric | Syncs credentials? | Notes |
|----------|-----------|-------------------|-------|
| iPhone (iOS Safari) | Face ID / Touch ID | ✅ iCloud Keychain | Works great in PWA mode |
| Android (Chrome) | Fingerprint / Face | ✅ Google Password Manager | Chrome 108+ |
| macOS (Safari) | Touch ID | ✅ iCloud Keychain | |
| macOS (Chrome) | Touch ID | ✅ Google account | |
| Windows (Chrome/Edge) | Windows Hello | ✅ Microsoft/Google | PIN fallback if no biometric |
| Firefox | Limited | ❌ No sync | Fallback to OTP |
| Linux Chrome | None | ❌ | [isWebAuthnSupported()](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/client/src/services/webauthnService.js#5-12) returns true but throws — catch gracefully |

---

### 2.12 Things to AVOID — WebAuthn

| ❌ AVOID | ✅ DO INSTEAD |
|---------|--------------|
| `RP_ID = 'https://yourdomain.com'` | `RP_ID = 'yourdomain.com'` (no protocol) |
| `VARCHAR(255)` for `credential_id` | `VARCHAR(512)` — iCloud keys are long |
| Storing `publicKey` Buffer directly | `isoBase64URL.fromBuffer(publicKey)` → string |
| Reading `public_key` string directly into verify | `isoBase64URL.toBuffer(storedKey)` → Buffer |
| `@simplewebauthn/browser` v9 + `@simplewebauthn/server` v8 | Both same major version |
| Ignoring `InvalidStateError` on enrollment | Treat as success — credential already exists |
| Showing biometric button without user identifier first | Always require phone/email before biometric |
| `userVerification: 'preferred'` | `userVerification: 'required'` — enforce biometric |
| PM2 cluster mode with in-memory challenge store | Use Redis for multi-process deployments |
| Re-asking enrollment every login | 24h dismissal cooldown after "Not now" |

---

---

---

## PART 4 — AI Rate Limiting & Off-Topic Protection (Production-Verified)

This is the exact system shipped in production for MaskPro GetSales v1.5.6.  
Copy-paste and adapt for the church AI helper.

### 4.1 What It Protects Against

| Threat | Protection |
|---|---|
| Button-mashing / double-send | In-flight per-user lock (server `Set`) |
| Rapid-fire questions | 5-second cooldown between requests |
| Unlimited daily abuse | 20 questions/day tracked in DB |
| Off-topic / nonsense questions | Regex pattern matching → skip AI credit |

---

### 4.2 Database Table

```sql
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id    INT NOT NULL,
  usage_date DATE NOT NULL,       -- 'YYYY-MM-DD' — auto-resets each day
  question_count INT DEFAULT 0,
  last_request_at TIMESTAMP NULL,
  PRIMARY KEY (user_id, usage_date),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> ⚠️ Use `DATE` not `TIMESTAMP` for `usage_date` — this ensures automatic daily reset without a cron job.

---

### 4.3 Complete Server Controller ([ai.controller.js](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/server/src/controllers/ai.controller.js))

```js
const axios = require('axios');
const pool = require('../config/database'); // adjust to your DB module path

const DAILY_LIMIT = 20;
const MIN_SECONDS_BETWEEN = 5;

// ── In-memory per-user lock (prevents double-sends in same process) ─────────
const inFlight = new Set();
// NOTE: If you use PM2 cluster mode (multiple processes), use Redis instead.
// For single-process apps (fork mode), a simple Set works perfectly.

// ── Off-topic pattern list — customize for your app ─────────────────────────
const OFF_TOPIC_PATTERNS = [
  /what.*(weather|temperature|forecast)/i,
  /tell me a joke/i,
  /write.*code|write.*script|write.*essay|write.*poem|write.*story/i,
  /who.*(president|prime minister|ceo|famous|actor|singer|celebrity)/i,
  /recipe|ingredients|cook|bake/i,
  /movie|film|series|netflix|show|episode/i,
  /game|play|minecraft|roblox/i,
  /stock|crypto|bitcoin|forex/i,
  /politics|election|vote|party/i,
  /^(test|testing|1234|asdf|hello world|lol|haha|ok|nice)\.?$/i, // exact nonsense
  /what are you|are you (an ai|human|robot|gpt|chatgpt)/i,
];

function isOffTopic(message) {
  if (message.trim().length <= 3) return true; // single letters / numbers
  return OFF_TOPIC_PATTERNS.some(p => p.test(message.trim()));
}

// ── Friendly response messages — make these warm and on-brand ────────────────
const RATE_MESSAGES = {
  in_flight:
    `✋ I'm still thinking about your last question! Let me finish that one first before we jump to the next. Quality over speed 😊`,

  too_fast:
    `⏳ Whoa, slow down a little! Give me at least a few seconds between questions. I want to give you a thoughtful answer, not a rushed one 🙏`,

  daily_limit:
    `🎉 You've been really active today — you've used all **${DAILY_LIMIT} questions** for today!\n\nNo worries, your limit resets at midnight. See you tomorrow 🌙 In the meantime, check the church Knowledgebase for answers.`,

  off_topic:
    `😄 I appreciate the curiosity! But I'm built specifically to help with church-related questions — events, cell groups, services, and prayer.\n\nTry asking something like:\n- *"When is the next Sunday service?"*\n- *"How do I join a cell group?"*\n- *"I need prayer support"*\n\nI'm here when you're ready! 🙏`,
};

// ── DB helpers ───────────────────────────────────────────────────────────────
async function getUsage(userId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const [[row]] = await pool.query(
    'SELECT question_count, last_request_at FROM ai_usage WHERE user_id = ? AND usage_date = ?',
    [userId, today]
  );
  return { today, row };
}

async function incrementUsage(userId, today) {
  await pool.query(`
    INSERT INTO ai_usage (user_id, usage_date, question_count, last_request_at)
    VALUES (?, ?, 1, NOW())
    ON DUPLICATE KEY UPDATE
      question_count = question_count + 1,
      last_request_at = NOW()
  `, [userId, today]);
}

// ── Main chat handler ─────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  const userId = req.user?.user_id;  // or req.user?.id — match your auth middleware
  try {
    const { message, context = {} } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

    // 1. In-flight lock
    if (inFlight.has(userId)) {
      return res.json({ reply: RATE_MESSAGES.in_flight, rate_limited: true });
    }

    // 2. Cooldown check
    const { today, row } = await getUsage(userId);
    if (row?.last_request_at) {
      const elapsed = (Date.now() - new Date(row.last_request_at).getTime()) / 1000;
      if (elapsed < MIN_SECONDS_BETWEEN) {
        return res.json({ reply: RATE_MESSAGES.too_fast, rate_limited: true });
      }
    }

    // 3. Daily limit
    if ((row?.question_count || 0) >= DAILY_LIMIT) {
      return res.json({ reply: RATE_MESSAGES.daily_limit, rate_limited: true, questions_remaining: 0 });
    }

    // 4. Off-topic detection (skip AI cost, still count the attempt)
    if (isOffTopic(message)) {
      await incrementUsage(userId, today);
      return res.json({
        reply: RATE_MESSAGES.off_topic,
        off_topic: true,
        questions_remaining: Math.max(0, DAILY_LIMIT - (row?.question_count || 0) - 1),
      });
    }

    // 5. All checks passed — call AI
    inFlight.add(userId);
    try {
      await incrementUsage(userId, today);

      // === BUILD YOUR SYSTEM PROMPT HERE ===
      const systemPrompt = `You are [App Name] AI helper...`;
      const prompt = `${systemPrompt}\n\nUser asks: "${message}"`;

      const response = await axios.post(
        'https://api.straico.com/v1/prompt/completion',
        { models: [process.env.STRAICO_MODEL], message: prompt },
        { headers: { Authorization: `Bearer ${process.env.STRAICO_API_KEY}` }, timeout: 30000 }
      );

      // Extract reply with 3 fallback paths
      const completions = response.data?.data?.completions;
      let reply = completions?.[process.env.STRAICO_MODEL]?.completion?.choices?.[0]?.message?.content
        || response.data?.completion?.choices?.[0]?.message?.content
        || response.data?.data?.completion?.choices?.[0]?.message?.content
        || "I'm having a little trouble right now. Please try again! 🙏";

      const remaining = Math.max(0, DAILY_LIMIT - (row?.question_count || 0) - 1);
      return res.json({ reply, questions_remaining: remaining });

    } finally {
      inFlight.delete(userId); // ALWAYS release the lock — even on error
    }

  } catch (err) {
    if (userId) inFlight.delete(userId);
    console.error('[AI] error:', err.message);
    return res.json({ reply: "I'm temporarily unavailable. Please try again. 🙏" });
  }
};

// ── Usage status (call on page load to restore quota) ─────────────────────────
exports.getUsageStatus = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const today = new Date().toISOString().slice(0, 10);
    const [[row]] = await pool.query(
      'SELECT COALESCE(question_count, 0) AS question_count FROM ai_usage WHERE user_id = ? AND usage_date = ?',
      [userId, today]
    );
    const remaining = Math.max(0, DAILY_LIMIT - (row?.question_count || 0));
    return res.json({ questions_remaining: remaining, daily_limit: DAILY_LIMIT });
  } catch {
    return res.json({ questions_remaining: DAILY_LIMIT, daily_limit: DAILY_LIMIT });
  }
};
```

---

### 4.4 Routes

```js
// ai.routes.js
router.post('/chat', authenticate, aiController.chat);
router.get('/usage-status', authenticate, aiController.getUsageStatus);
```

---

### 4.5 Frontend — Daily Quota UI (React)

```jsx
const DAILY_LIMIT = 20; // keep in sync with server

// State
const [questionsLeft, setQuestionsLeft] = useState(DAILY_LIMIT);
const [isLimitReached, setIsLimitReached] = useState(false);

// On mount — fetch today's remaining count
useEffect(() => {
  api.get('/ai/usage-status').then(r => {
    const rem = r.data?.questions_remaining ?? DAILY_LIMIT;
    setQuestionsLeft(rem);
    setIsLimitReached(rem <= 0);
  }).catch(() => {});
}, []);

// After each AI response — update the count
const sendMessage = async (text) => {
  // ...post to /ai/chat...
  const { data } = await api.post('/ai/chat', { message: text });
  setMessages(m => [...m, { role: 'assistant', text: data.reply }]);
  if (typeof data.questions_remaining === 'number') {
    setQuestionsLeft(data.questions_remaining);
    setIsLimitReached(data.questions_remaining <= 0);
  }
};

// Color coding for the counter pill:
// green = >10, amber = 6-10, red = 1-5
const countColor = questionsLeft > 10
  ? 'text-emerald-500'
  : questionsLeft > 5
    ? 'text-amber-500'
    : 'text-red-500';

// ── JSX snippets ─────────────────────────────────────────────────────────────

// Counter pill in header:
<div className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 ${countColor}`}>
  <span className="text-[11px] font-bold">{questionsLeft}/{DAILY_LIMIT}</span>
  <span className="text-[10px] text-gray-400 font-medium">left today</span>
</div>

// Locked banner (show when isLimitReached):
{isLimitReached && (
  <div className="mb-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
    <div className="text-2xl mb-1">🔒</div>
    <p className="text-xs font-semibold text-amber-700">You've used all {DAILY_LIMIT} questions for today.</p>
    <p className="text-xs text-amber-600 mt-0.5">Limit resets at midnight — see you tomorrow! 🌙</p>
  </div>
)}

// Loading hint (show while AI is thinking):
{loading && (
  <p className="text-[10px] text-center text-amber-500 font-medium mb-1.5 animate-pulse">
    ⏳ Hold on, I'm thinking… please wait a moment
  </p>
)}

// Disable input + send button + chips:
<input
  placeholder={isLimitReached ? "Daily limit reached — come back tomorrow!" : "Ask the AI helper..."}
  disabled={loading || isLimitReached}
/>
<button disabled={loading || !input.trim() || isLimitReached}>
  Send
</button>
```

---

### 4.6 Off-Topic Patterns — Customize For Your App

For a **church AI helper**, add these additional patterns:

```js
const OFF_TOPIC_PATTERNS = [
  // General nonsense
  /what.*(weather|temperature)/i,
  /tell me a joke/i,
  /write.*(code|poem|essay|story)/i,
  /who.*(president|politician|actor|singer|celebrity)/i,
  /recipe|cook|bake/i,
  /movie|netflix|game|roblox/i,
  /crypto|bitcoin|forex|stock/i,
  /^(test|ok|lol|haha|wow|nice|kamusta|musta)\.?$/i, // short nonsense

  // Church-specific conflicts to deflect gracefully
  /which.*(religion|denomination) is (right|true|best)/i,  // don't pick sides
  /bash.*other.*church|criticize.*church/i,
  /lottery|gambling/i,
];
```

---

### 4.7 Rate Limiting — Things to AVOID

| ❌ AVOID | ✅ DO INSTEAD |
|---|---|
| Using Express `express-rate-limit` middleware | DB-based tracking — works across deploys, survives restarts |
| Storing count in `req.session` or memory only | `ai_usage` DB table — persists across server restarts |
| PM2 cluster mode with in-memory `Set` | Use Redis for the in-flight lock if multi-process |
| Off-topic auto-ban (blocking the user permanently) | Just return a friendly refocus message — they still get their 20 tries |
| Counting off-topic as NOT consuming quota | Count it — otherwise users probe for free by asking nonsense |
| Daily limit based on `TIMESTAMP` column | Use `DATE` column — auto-buckets by calendar day without cron |

---

### 4.8 ⚠️ CRITICAL PRODUCTION GOTCHA — DB Migration Gap

> **This bug was caught in production.** Here's exactly what happened and how to never let it happen again.

**The bug:**
The `ai_usage` table was created in **local MySQL only**. The controller was deployed expecting the table to exist. On every request, [getUsage()](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/server/src/controllers/ai.controller.js#71-80) threw `Table 'maskpro_commissions.ai_usage' doesn't exist`. The outer `catch` block caught this and returned:

```
"I'm temporarily unavailable. Please try again in a moment. 🙏"
```

The **entire AI feature was broken** in production — not just rate limiting.

---

**Rule: Always run DB migrations on the production server BEFORE deploying code that depends on them.**

```bash
# Run this on the prod server BEFORE rsync-ing the new controller:
ssh root@your-server 'mysql -u root your_db <<EOF
CREATE TABLE IF NOT EXISTS ai_usage (...);
EOF'
```

Use `IF NOT EXISTS` always — safe to re-run.

---

**Defense: Wrap rate-limiting DB calls in their own inner try/catch**

The outer `try/catch` in any Express handler should only catch truly unexpected errors. Rate-limiting is optional infrastructure — if it fails, the core feature must still work.

```js
exports.chat = async (req, res) => {
  const userId = req.user?.user_id;
  try {
    // ... validate input ...

    // ── Rate limiting (OPTIONAL — degrade gracefully if DB unavailable) ──
    let rateCheckPassed = true;
    let usedToday = 0;
    let todayDate = new Date().toISOString().slice(0, 10);

    try {
      // in-flight lock, cooldown, daily limit checks here
      const { today, row } = await getUsage(userId);
      todayDate = today;
      usedToday = row?.question_count || 0;
      // ... checks ...
    } catch (rateErr) {
      // Table missing, DB down, etc. — log it but don't fail the user
      console.warn('[AI] Rate limit DB check failed (degraded mode):', rateErr.message);
      rateCheckPassed = false;
      // AI call will still proceed below
    }

    // ── AI call ──────────────────────────────────────────────────────────
    inFlight.add(userId);
    try {
      // Best-effort count increment — never let this block the AI call
      if (rateCheckPassed) {
        try { await incrementUsage(userId, todayDate); } catch {}
      }

      // ... call Straico, return reply ...

    } finally {
      inFlight.delete(userId); // ALWAYS release lock
    }

  } catch (err) {
    if (userId) inFlight.delete(userId);
    console.error('[AI] error:', err.message);
    return res.json({ reply: "I'm temporarily unavailable. Please try again. 🙏" });
  }
};
```

**Key pattern:** The inner `try/catch` catches DB errors. The outer `try/catch` catches truly unexpected errors. They serve different purposes — never flatten them into one.

---



### For a Church App Specifically

**Auth strategy choices:**
- **OTP (SMS)** — easiest for church members, no password to forget
- **Magic link (email)** — good for those without Philippine numbers
- **WebAuthn** — optional layer on top; never the only login method

**Always keep OTP/email as fallback.** Never gate the app behind biometrics-only login. Some members use old Androids or Firefox where WebAuthn is limited.

### API Error Strategy
- **AI chat endpoint:** Always return `{ reply: "..." }` — never a 500. Friendly fallback text.
- **Biometric endpoints:** Return structured JSON errors with clear messages. `{ error: "Challenge expired. Please try again." }` — not stack traces.
- **All endpoints:** Log errors server-side with `[context] message` prefix for easy grepping.

### Environment Variables Pattern
```bash
# Always have these three for any AI + biometric feature:
STRAICO_API_KEY=
STRAICO_MODEL=openai/gpt-4o-mini
WEBAUTHN_RP_ID=yourdomain.com
WEBAUTHN_ORIGIN=https://yourdomain.com

# Local dev overrides (.env.local):
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
```

### Mobile-First UI Principles
- **Bottom navigation dock** (5 items, center FAB) — make it feel like a native app
- **`env(safe-area-inset-bottom)`** on the dock for iPhone notch
- **`-webkit-tap-highlight-color: transparent`** globally — removes tap flash
- **`overflow: hidden` on parent = dropdown gets clipped** — never add it to card wrappers that have menus
- **Horizontal scroll stat cards** — always `scrollbarWidth: 'none'` and `-mx-4 px-4` for edge-to-edge
- **Skeleton loaders** over spinners — show the shape of content before it loads

### Next.js-Specific
- D3.js visualizations (network trees, charts): `dynamic(() => import(...), { ssr: false })` — they crash during SSR
- Use `output: 'standalone'` in [next.config.js](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/public-web/next.config.js) for Docker builds
- `middleware.js` for auth guard — reads JWT cookie, redirects if missing
- Fonts: use `next/font/google` — it self-hosts and avoids GDPR issues

---

## Quick Reference: What the Consultant Has Shipped

| Feature | Pattern | Key Risk |
|---------|---------|----------|
| Straico AI Chat | Scoped system prompt + knowledge JSON | Model response format changes — use fallbacks |
| WebAuthn Enrollment | Post-login modal, 24h dismissal | `InvalidStateError` = success, not error |
| WebAuthn Login | localStorage + server fallback for button visibility | RP_ID mismatch breaks everything silently |
| Horizontal scroll chips | CSS marquee + `[...row, ...row]` duplication | `chipScrollRight` must start at `-50%` |
| Mobile chat layout | `h-[calc(100vh-header-dock)]` | Changes if header height changes (impersonation bar etc) |
| Challenge store | In-memory Map + 5min TTL | Multi-process needs Redis |
| Public key storage | `isoBase64URL.fromBuffer()` ↔ `.toBuffer()` | Forgetting = silent verify failure |
