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

**Animated suggestion chips (conversation starters):**
```css
@keyframes chipScrollLeft  { 0% { transform: translateX(0);    } 100% { transform: translateX(-50%); } }
@keyframes chipScrollRight { 0% { transform: translateX(-50%); } 100% { transform: translateX(0);    } }
```
- Duplicate each chip row (`[...row, ...row]`) for seamless infinite loop
- Pause animation on hover/touch so users can tap chips without them moving
- Split chips into 2-3 rows scrolling opposite directions for visual interest

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
  // header 56px, bottom dock 64px
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

## PART 3 — General Architecture Principles

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
