# MaskPro GetSales — Biometric Login (WebAuthn/Passkeys)
## Complete Implementation Guide for IDE Agent

---

## 0. What Was Built

A full **WebAuthn (Passkeys)** biometric login system allowing agents to sign in with:
- 📱 **iPhone** → Face ID or Touch ID
- 🤖 **Android** → Fingerprint / Face Unlock
- 💻 **MacBook** → Touch ID (fingerprint on keyboard)
- 🖥 **Windows PC** → Windows Hello (PIN, fingerprint, face)
- 🖥 **Desktop Chrome/Edge** → Platform authenticator if device supports it

The system uses the **WebAuthn Level 2 standard** via the `@simplewebauthn/browser` (client) and `@simplewebauthn/server` (server) libraries. No proprietary SDK — fully standards-based and works cross-browser.

---

## 1. How It Works (The Concept)

WebAuthn is a challenge-response protocol. The device holds a **private key** (securely stored in hardware/Secure Enclave/TPM), and the server holds the **public key**.

### Registration Flow (Enrollment)
```
Client                        Server
  |-- POST /webauthn/register-options → get challenge + RP config
  |   (requires JWT auth — user must be logged in)
  |
  |-- navigator.credentials.create(options)
  |   ← Browser shows Face ID / Touch ID / fingerprint prompt
  |   ← User verifies successfully
  |   ← Device creates key pair, stores private key in Secure Enclave/TPM
  |
  |-- POST /webauthn/register-verify → send public key + attestation
  |   Server stores: credential_id, public_key, counter, device_name
  |
localStorage.setItem('webauthn-enrolled', { [phone]: true })
  ← Local flag so Login page knows to show biometric button
```

### Authentication Flow (Login)
```
Client                        Server
  |-- POST /webauthn/login-options → get challenge
  |   (NO auth required — takes phone number)
  |   Server returns: challenge + allowCredentials (list of known cred IDs for this user)
  |
  |-- navigator.credentials.get(options)
  |   ← Browser shows Face ID / Touch ID prompt
  |   ← User verifies
  |   ← Device signs challenge with private key
  |
  |-- POST /webauthn/login-verify → send signed challenge + credential
  |   Server verifies signature, updates counter, issues JWT
  |
  |-- biometricLogin(result) → store JWT in Zustand + localStorage
  |-- navigate('/dashboard')
```

---

## 2. Tech Stack

| Layer | Package | Version |
|-------|---------|---------|
| Client | `@simplewebauthn/browser` | `^9.x` |
| Server | `@simplewebauthn/server` | `^9.x` |
| Server helpers | `@simplewebauthn/server/helpers` | same pkg |

> ⚠️ **Version lock warning:** `@simplewebauthn/browser` and `@simplewebauthn/server` MUST be the same major version. Mixing versions (e.g. browser v9 + server v8) causes `optionsJSON` format mismatches that are very hard to debug.

---

## 3. Database Schema

```sql
CREATE TABLE webauthn_credentials (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  credential_id VARCHAR(512) NOT NULL UNIQUE,  -- base64url encoded
  public_key    TEXT NOT NULL,                   -- base64url encoded
  counter       BIGINT NOT NULL DEFAULT 0,       -- replay attack protection
  device_name   VARCHAR(255),                    -- "Touch ID", "Face ID", etc.
  transports    JSON,                            -- ["internal"], ["usb"], etc.
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_credential (credential_id)
);
```

**Key field notes:**
- `credential_id` — Base64URL string returned by the device. Can be up to 512 chars on some platforms (especially iCloud Keychain sync). Use `VARCHAR(512)` NOT `VARCHAR(255)` — this caused production bugs.
- `counter` — Increments on every authentication. If server receives a counter ≤ stored counter, REJECT (replay attack). Use `BIGINT`, not `INT` (some devices have very high counters).
- `transports` — Array like `["internal"]` for device biometrics, `["usb"]` for hardware keys. Store as JSON text and parse on retrieval.
- `public_key` — The device's public key as base64url. Use `TEXT`, not `VARCHAR` — RSA public keys can be long.

---

## 4. Backend Implementation

### 4.1 Config

```js
// webauthn.controller.js — at the top
const RP_NAME = 'MaskPro GetSales';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'getsales.maskpro.ph';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'https://getsales.maskpro.ph';
```

> ⚠️ **Critical:** `RP_ID` must match the domain exactly without protocol or path.
> If your site is `getsales.maskpro.ph`, RP_ID = `getsales.maskpro.ph`.
> If your site is `maskpro.ph` (naked domain), RP_ID = `maskpro.ph`.
> **Mismatch = every verification will fail with `InvalidRPID` error.**

**For local development:**
```
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
```
WebAuthn works on `localhost` without HTTPS. It does NOT work on `127.0.0.1` in most browsers.

### 4.2 Challenge Store

Challenges MUST be stored server-side, issued per-request, and consumed exactly once.

```js
// In-memory store (fine for single-server; use Redis for multi-instance)
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
    return null;
  }
  return entry.challenge;
}

function clearChallenge(userId) {
  challengeStore.delete(String(userId));
}
```

> ⚠️ **Gotcha:** In production with PM2 clusters or multiple processes, the in-memory Map is NOT shared across processes. Biometric login will randomly fail (challenge not found) depending on which process handles the verify request. **Solution:** Use Redis or sticky sessions.
>
> Currently this app runs PM2 in `fork` mode (single process) so the in-memory store works fine. If ever switching to `cluster` mode, switch to Redis.

### 4.3 Registration Options (POST `/auth/webauthn/register-options`) — Requires JWT Auth

```js
async generateRegOptions(req, res, next) {
  const userId = req.user.user_id;
  const [userRows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
  const user = userRows[0];

  // IMPORTANT: Exclude already-registered credentials for this user
  // Without this, re-enrolling the same device creates duplicate DB records
  const [existingCreds] = await pool.query(
    'SELECT credential_id FROM webauthn_credentials WHERE user_id = ?', [userId]
  );

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.phone || user.email,        // displayed in OS biometric prompt
    userDisplayName: user.full_name || user.phone,
    userID: new TextEncoder().encode(String(userId)), // MUST be Uint8Array
    attestationType: 'none',                   // 'none' = no cert chain needed
    authenticatorSelection: {
      authenticatorAttachment: 'platform',     // CRITICAL: 'platform' = device biometrics only
                                               // 'cross-platform' = hardware keys (YubiKey)
                                               // omit this to allow both
      userVerification: 'required',            // MUST verify biometric (not just presence)
      residentKey: 'preferred',                // 'preferred' = passkey if supported
    },
    excludeCredentials: existingCreds.map(c => ({ id: c.credential_id })),
  });

  storeChallenge(userId, options.challenge);
  res.json(options);
}
```

### 4.4 Verify Registration (POST `/auth/webauthn/register-verify`) — Requires JWT Auth

```js
async verifyRegistration(req, res, next) {
  const userId = req.user.user_id;
  const { credential, deviceName } = req.body;

  const expectedChallenge = getChallenge(userId);
  if (!expectedChallenge) {
    return res.status(400).json({ error: 'Challenge expired. Please try again.' });
  }

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: 'Verification failed.' });
  }

  const { credential: regCred, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  await pool.query(
    `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_name, transports)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      regCred.id,
      isoBase64URL.fromBuffer(regCred.publicKey),  // MUST convert Buffer → base64url for storage
      regCred.counter,
      deviceName || `${credentialDeviceType}${credentialBackedUp ? ' (backed up)' : ''}`,
      JSON.stringify(credential.response?.transports || []),
    ]
  );

  clearChallenge(userId);
  res.json({ verified: true, message: 'Biometric login enabled!' });
}
```

> ⚠️ **Gotcha:** `regCred.publicKey` is a `Buffer`. You MUST call `isoBase64URL.fromBuffer()` before storing. Storing the raw Buffer object as a string will produce garbage data and break all future verifications.

### 4.5 Authentication Options (POST `/auth/webauthn/login-options`) — No Auth

```js
async generateAuthOptions(req, res, next) {
  const { phone } = req.body;
  const user = await UserModel.findByPhone(phone);
  if (!user) return res.status(404).json({ error: 'No account found.' });

  const [creds] = await pool.query(
    'SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = ?',
    [user.user_id]
  );

  if (creds.length === 0) {
    return res.status(404).json({ error: 'No biometric credentials enrolled.' });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials: creds.map(c => ({
      id: c.credential_id,
      transports: JSON.parse(c.transports || '[]'),
    })),
  });

  storeChallenge(user.user_id, options.challenge);
  res.json({ options, userId: user.user_id });
}
```

### 4.6 Verify Authentication (POST `/auth/webauthn/login-verify`) — No Auth → Returns JWT

```js
async verifyAuthentication(req, res, next) {
  const { credential, userId } = req.body;

  const expectedChallenge = getChallenge(userId);
  if (!expectedChallenge) {
    return res.status(400).json({ error: 'Challenge expired. Please try again.' });
  }

  const [creds] = await pool.query(
    'SELECT * FROM webauthn_credentials WHERE credential_id = ? AND user_id = ?',
    [credential.id, userId]
  );
  const storedCred = creds[0];

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: storedCred.credential_id,
      publicKey: isoBase64URL.toBuffer(storedCred.public_key),  // MUST convert back from base64url
      counter: storedCred.counter,
    },
  });

  if (!verification.verified) {
    return res.status(401).json({ error: 'Biometric verification failed.' });
  }

  // CRITICAL: Update counter after successful auth (replay attack prevention)
  await pool.query(
    'UPDATE webauthn_credentials SET counter = ? WHERE id = ?',
    [verification.authenticationInfo.newCounter, storedCred.id]
  );

  clearChallenge(userId);

  const [userRows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
  const user = userRows[0];
  const { accessToken, refreshToken } = buildTokens(user);

  res.json({ accessToken, refreshToken, user: buildUserResponse(user) });
}
```

> ⚠️ **Gotcha:** `isoBase64URL.toBuffer(storedCred.public_key)` converts the stored base64url string back to a `Buffer`. Forgetting this conversion causes `Invalid public key format` errors during authentication — the verification step silently accepts it but returns `verified: false`.

### 4.7 Has Credentials Check (GET `/auth/webauthn/has-credentials?phone=...`) — No Auth

```js
async hasCredentials(req, res, next) {
  const { phone } = req.query;
  const user = await UserModel.findByPhone(phone);
  if (!user) return res.json({ hasCredentials: false });

  const [creds] = await pool.query(
    'SELECT COUNT(*) as count FROM webauthn_credentials WHERE user_id = ?',
    [user.user_id]
  );
  res.json({ hasCredentials: creds[0].count > 0 });
}
```

### 4.8 Routes

```js
// auth.routes.js
// Login (NO auth required — user not logged in yet)
router.post('/webauthn/login-options', WebAuthnController.generateAuthOptions);
router.post('/webauthn/login-verify', WebAuthnController.verifyAuthentication);
router.get('/webauthn/has-credentials', WebAuthnController.hasCredentials);

// Registration (REQUIRES auth — user must be logged in via OTP first)
router.post('/webauthn/register-options', authenticate, WebAuthnController.generateRegOptions);
router.post('/webauthn/register-verify', authenticate, WebAuthnController.verifyRegistration);
```

---

## 5. Frontend Service Layer ([webauthnService.js](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/client/src/services/webauthnService.js))

### Full File

```js
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

const API = import.meta.env.VITE_API_URL || '';
// For Next.js: const API = process.env.NEXT_PUBLIC_API_URL || '';

/** Check WebAuthn support */
export function isWebAuthnSupported() {
  return !!(window.PublicKeyCredential && typeof window.PublicKeyCredential === 'function');
}

/** Detect biometric type from user agent */
export function getBiometricType() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 0 || /Mac/.test(navigator.platform);

  if (isIOS) return 'face-id';     // iOS: Face ID label (most modern iPhones)
  if (isMac || /Macintosh/.test(ua)) return 'touch-id';  // Mac: Touch ID
  return 'fingerprint';            // Android/Windows: generic fingerprint
}

export function getBiometricLabel() {
  const type = getBiometricType();
  switch (type) {
    case 'face-id': return 'Face ID';
    case 'touch-id': return 'Touch ID';
    case 'fingerprint': return 'Fingerprint';
    default: return 'Biometrics';
  }
}

// ── Enrollment status stored in localStorage ──
// Key: 'webauthn-enrolled' → JSON { [phone]: true }
// ⚠️ This is PER-DEVICE. If user enrolls on iPhone, their Mac won't show biometric button
//    until they also enroll on Mac (or until the server-credential check fires)

export function setEnrolled(phone) {
  const enrolled = JSON.parse(localStorage.getItem('webauthn-enrolled') || '{}');
  enrolled[phone] = true;
  localStorage.setItem('webauthn-enrolled', JSON.stringify(enrolled));
}

export function isEnrolled(phone) {
  if (!phone) return false;
  const enrolled = JSON.parse(localStorage.getItem('webauthn-enrolled') || '{}');
  return !!enrolled[phone];
}

// ── Dismissal tracking (don't ask again for 24h after "Not now") ──
export function dismissEnrollment() {
  localStorage.setItem('webauthn-enroll-dismissed', Date.now().toString());
}

export function isEnrollmentDismissed() {
  const dismissed = localStorage.getItem('webauthn-enroll-dismissed');
  if (!dismissed) return false;
  return Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000;
}

/** Register biometric — call AFTER OTP login */
export async function registerBiometric(token) {
  // Step 1: Get server challenge
  const optionsRes = await fetch(`${API}/api/auth/webauthn/register-options`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!optionsRes.ok) throw new Error('Failed to get registration options');
  const options = await optionsRes.json();

  // Step 2: Activate device biometric
  // ← This line triggers the OS native prompt (Face ID, Touch ID, Windows Hello)
  const credential = await startRegistration({ optionsJSON: options });

  // Step 3: Verify with server
  const verifyRes = await fetch(`${API}/api/auth/webauthn/register-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ credential, deviceName: getBiometricLabel() }),
  });
  if (!verifyRes.ok) {
    const data = await verifyRes.json();
    throw new Error(data.error || 'Verification failed');
  }
  return verifyRes.json();
}

/** Authenticate with biometric — call from login page */
export async function authenticateWithBiometric(phone) {
  // Step 1: Get challenge
  const optionsRes = await fetch(`${API}/api/auth/webauthn/login-options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!optionsRes.ok) {
    const data = await optionsRes.json();
    throw new Error(data.error || 'Failed to get auth options');
  }
  const { options, userId } = await optionsRes.json();

  // Step 2: Activate device biometric
  const credential = await startAuthentication({ optionsJSON: options });

  // Step 3: Verify + get JWT
  const verifyRes = await fetch(`${API}/api/auth/webauthn/login-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, userId }),
  });
  if (!verifyRes.ok) {
    const data = await verifyRes.json();
    throw new Error(data.error || 'Biometric login failed');
  }
  return verifyRes.json();
}

/** Check server for enrolled credentials (cross-device support) */
export async function checkServerCredentials(phone) {
  try {
    const res = await fetch(`${API}/api/auth/webauthn/has-credentials?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    return data.hasCredentials;
  } catch {
    return false;
  }
}
```

---

## 6. Enrollment Flow (BiometricEnrollModal)

Shown **800ms after successful OTP login**, only once per device per login session.

### Trigger Logic (in MainLayout.jsx)

```js
// In MainLayout useEffect:
const justLoggedIn = sessionStorage.getItem('just-logged-in');
if (user && justLoggedIn && isWebAuthnSupported() && !isEnrolled(user.phone) && !isEnrollmentDismissed()) {
  const timer = setTimeout(() => setShowEnrollModal(true), 800);  // 800ms delay feels natural
  return () => clearTimeout(timer);
}
```

```js
// In LoginPage — set the session flag on successful OTP login:
sessionStorage.setItem('just-logged-in', '1');
navigate('/dashboard', { replace: true });

// In MainLayout — clear it after showing the modal:
const handleEnrollClose = () => {
  setShowEnrollModal(false);
  sessionStorage.removeItem('just-logged-in');  // prevent showing again this session
};
```

### Error Handling in Enrollment

```js
try {
  await registerBiometric(token);
  setEnrolled(user.phone);
  setSuccess(true);
} catch (err) {
  if (err.name === 'InvalidStateError') {
    // ← Credential already exists on this device (e.g. synced via iCloud Keychain)
    // Treat this as success — the device is already enrolled
    setEnrolled(user.phone);
    setSuccess(true);
  } else if (err.name === 'NotAllowedError') {
    // ← User cancelled the biometric prompt or denied permission
    setError('Biometric was cancelled or denied.');
  } else {
    setError(err.message || 'Failed to enroll biometric.');
  }
}
```

> ⚠️ **Critical gotcha:** `InvalidStateError` means the browser already has this credential. This happens when:
> a) User enrolled previously and cleared localStorage (so [isEnrolled()](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/client/src/services/webauthnService.js#68-76) returned false but server has it)
> b) Credential synced via iCloud Keychain from another device
> **Always treat `InvalidStateError` as success**, not failure.

### Modal UI Structure

```
┌──────────────────────────────────┐
│  Brand blue gradient header       │
│  🔓 (biometric icon)              │
│  "Enable Face ID?"                │
│  "Sign in faster on this device"  │
├──────────────────────────────────┤
│  ⚡ Instant login — no OTP needed │
│  🔒 Secured by your device       │
│  📱 Works on this device only    │
│  [error message if any]           │
├──────────────────────────────────┤
│  [Enable Face ID]                 │  ← brand-600 button
│  [Not now]                        │  ← gray text button
│  "Your biometric data never leaves your device"
└──────────────────────────────────┘
```

---

## 7. Login Page Biometric Logic

### Two Ways Biometric Button Appears

**Method 1 — localStorage check (fast, instant on page load):**
```js
useEffect(() => {
  if (isWebAuthnSupported()) {
    const enrolled = JSON.parse(localStorage.getItem('webauthn-enrolled') || '{}');
    const enrolledPhones = Object.keys(enrolled).filter(p => enrolled[p]);
    if (enrolledPhones.length > 0) {
      setShowBiometric(true);
      // Auto-fill phone if only one enrolled phone
      if (enrolledPhones.length === 1 && !phone) {
        setPhone(enrolledPhones[0]);
      }
    }
  }
}, []);
```

**Method 2 — Server check (cross-device fallback, fires after phone typed):**
```js
useEffect(() => {
  // Only fires if NOT already showing biometric (avoids redundant requests)
  if (!isWebAuthnSupported() || !phone || phone.length < 11 || showBiometric) return;
  let cancelled = false;
  checkServerCredentials(phone).then(has => {
    if (!cancelled && has) setShowBiometric(true);
  });
  return () => { cancelled = true; };
}, [phone, showBiometric]);
```

This covers the case where:
- User enrolled on iPhone, now logging in on Mac (localStorage not shared across devices)
- User cleared localStorage / private browsing mode

### Biometric Login Handler

```js
const handleBiometricLogin = useCallback(async () => {
  if (!phone) {
    setBiometricError('Enter your phone number first');
    return;
  }
  setBiometricLoading(true);
  try {
    const result = await authenticateWithBiometric(phone);
    await biometricLogin(result);  // store JWT in Zustand
    navigate('/dashboard', { replace: true });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      setBiometricError('Biometric was cancelled.');
    } else {
      setBiometricError(err.message || 'Biometric login failed. Try OTP instead.');
    }
  }
  setBiometricLoading(false);
}, [phone, biometricLogin, navigate]);
```

### Login Page UI When Biometric Available

```
┌──────────────────────────────────┐
│  Mobile Number                    │
│  [🇵🇭 +63] [09XX XXX XXXX    ]   │
│                                    │
│  [🔓 Use Face ID          ]       │  ← dark button (gray-900 bg)
│   error message if any             │
│                                    │
│  ─────────── Or login with ─────── │
│                                    │
│  [📱 Mobile OTP] [📧 Magic Link]   │  ← tabs
└──────────────────────────────────┘
```

Note: OTP tab is still available below as fallback. User is never locked out.

---

## 8. Platform-by-Platform Behavior

### 8.1 iPhone (iOS Safari / PWA)

| Aspect | Detail |
|--------|--------|
| Biometric type | Face ID (iPhone X+) or Touch ID (SE, older models) |
| OS prompt | Native Face ID / Touch ID sheet slides up from bottom |
| Browser support | Safari 14+, Chrome iOS 112+ |
| Passkey sync | ✅ Syncs to iCloud Keychain across Apple devices |
| Cross-device | ✅ If enrolled on iPhone, credential available on iPad/Mac (same iCloud) |
| Detection | [getBiometricType()](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/client/src/services/webauthnService.js#13-32) → `/iPad|iPhone|iPod/.test(ua)` → returns `'face-id'` |
| Limitation | Cannot reliably detect Face ID vs Touch ID from UA alone |
| PWA behavior | Works in standalone PWA mode same as Safari |

### 8.2 Android (Chrome)

| Aspect | Detail |
|--------|--------|
| Biometric type | Fingerprint, face unlock, or screen lock PIN |
| OS prompt | Android biometric bottom sheet |
| Browser support | Chrome 108+ (most reliable), Samsung Internet |
| Passkey sync | ✅ Syncs to Google Password Manager across Android devices |
| Detection | [getBiometricType()](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/client/src/services/webauthnService.js#13-32) → returns `'fingerprint'` |
| Limitation | Some older Android devices (API < 28) may not support WebAuthn |

### 8.3 macOS (Safari, Chrome)

| Aspect | Detail |
|--------|--------|
| Biometric type | Touch ID (fingerprint on keyboard) |
| OS prompt | macOS Touch ID dialog appears in the browser |
| Browser support | Safari 14+, Chrome 86+ with correct RP_ID |
| Passkey sync | ✅ Safari syncs via iCloud Keychain; Chrome syncs via Google account |
| Detection | [getBiometricType()](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/client/src/services/webauthnService.js#13-32) → `/Macintosh/.test(ua)` → returns `'touch-id'` |
| HTTPS required | ✅ localhost works without HTTPS. Any other domain requires HTTPS |
| Limitation | Chrome on Mac requires the macOS version AND Chrome version to both be recent |

### 8.4 Windows (Chrome, Edge)

| Aspect | Detail |
|--------|--------|
| Biometric type | Windows Hello (PIN, fingerprint, face) |
| OS prompt | Windows Hello dialog |
| Browser support | Chrome 86+, Edge 86+ |
| Passkey sync | Edge: syncs via Microsoft account; Chrome: syncs via Google account |
| Detection | [getBiometricType()](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/client/src/services/webauthnService.js#13-32) → returns `'fingerprint'` (generic) |
| Fallback | If no biometric hardware, Windows Hello offers PIN entry |

### 8.5 Firefox

| Aspect | Detail |
|--------|--------|
| Support | ⚠️ Limited — WebAuthn works but Passkey sync not supported |
| Behavior | Uses security key or device authenticator if available |
| iCloud Keychain | ❌ Not available |
| Recommendation | Show biometric button but gracefully fall back to OTP on failure |

### 8.6 Desktop Chrome (Linux)

| Aspect | Detail |
|--------|--------|
| Support | ❌ No platform authenticator if no biometric hardware |
| Error | `NotAllowedError` or `NotSupportedError` |
| Handling | [isWebAuthnSupported()](file:///Applications/XAMPP/xamppfiles/htdocs/getsales.maskpro.ph/client/src/services/webauthnService.js#5-12) returns true, but `startRegistration()` will throw |
| UX | Don't show biometric section on Linux Chrome (no way to detect in advance) |

---

## 9. Hard-Learned Gotchas & Things to AVOID

### ❌ NEVER — RP_ID Mistakes
```
// WRONG — causes InvalidRPIDError on all verifications
const RP_ID = 'https://getsales.maskpro.ph';  // No protocol!
const RP_ID = 'getsales.maskpro.ph/';          // No trailing slash!
const RP_ID = 'www.getsales.maskpro.ph';       // Must match exactly

// CORRECT
const RP_ID = 'getsales.maskpro.ph';
```

### ❌ NEVER — Store Raw Buffer as String
```js
// WRONG — corrupts the public key in DB
credential_id: Buffer.from(regCred.id).toString('utf8'),  // garbage
public_key: regCred.publicKey.toString(),                  // garbage

// CORRECT — use SimpleWebAuthn's ISO helpers
credential_id: regCred.id,                                  // already base64url string
public_key: isoBase64URL.fromBuffer(regCred.publicKey),     // convert Buffer → base64url
```

### ❌ NEVER — Forget isoBase64URL.toBuffer on Verification
```js
// WRONG — verifyAuthenticationResponse receives wrong type
credential: {
  publicKey: storedCred.public_key,  // This is a string — WRONG
}

// CORRECT
credential: {
  publicKey: isoBase64URL.toBuffer(storedCred.public_key),  // Convert back to Buffer
}
```

### ❌ NEVER — version mismatch between browser and server packages
```json
// WRONG
"@simplewebauthn/browser": "^8.0.0",
"@simplewebauthn/server": "^9.0.0"

// CORRECT — both same major version
"@simplewebauthn/browser": "^9.0.0",
"@simplewebauthn/server": "^9.0.0"
```

### ❌ NEVER — Ignore `InvalidStateError` during enrollment
```js
// WRONG — shows error, confuses user
} catch (err) {
  setError(err.message);  // Shows "The authenticator was previously registered"
}

// CORRECT — this is success: credential already exists (iCloud Keychain sync, re-enrollment)
} catch (err) {
  if (err.name === 'InvalidStateError') {
    setEnrolled(user.phone);  // Already enrolled, just mark locally
    setSuccess(true);
  }
}
```

### ❌ NEVER — Use `crossPlatform` when you want device biometrics
```js
// WRONG — allows hardware security keys instead of biometrics
authenticatorAttachment: 'cross-platform'

// CORRECT — device-only (Touch ID, Face ID, fingerprint)
authenticatorAttachment: 'platform'
```

### ❌ NEVER — Use VARCHAR(255) for credential_id in DB
```sql
-- WRONG — iCloud Keychain credential IDs can exceed 255 chars
credential_id VARCHAR(255)

-- CORRECT
credential_id VARCHAR(512)  -- or TEXT
```

### ❌ NEVER — Store challenge in DB instead of memory
Challenges are one-time-use, short-lived (5 min), and write-heavy. DB storage adds unnecessary latency. Use in-memory Map (single server) or Redis (multi-server).

### ❌ NEVER — Show biometric button without phone number
```js
// WRONG — user taps biometric button without knowing what account it's for
<button onClick={handleBiometricLogin}>Use Face ID</button>

// CORRECT — require phone input first (so server can look up the credential)
<input value={phone} onChange={...} />  // phone field always visible
<button disabled={!phone} onClick={handleBiometricLogin}>Use Face ID</button>
```

### ❌ NEVER — Use `userVerification: 'preferred'` for login
```js
// WRONG — some devices may skip biometric and just check "presence"
userVerification: 'preferred'

// CORRECT — REQUIRE biometric verification (not just device presence)
userVerification: 'required'
```

### ❌ NEVER — Forget to clear the challenge after verification (or on failure)
```js
// If challenge is not cleared after successful auth,
// PM2 restart won't clear it, and it'll expire in 5min naturally
// But it's better practice to always clearChallenge() immediately after use

clearChallenge(userId);  // Always call this after verifying (success or failure)
```

### ❌ NEVER — Show enrollment modal on every login if dismissed
```js
// WRONG — annoys users who tapped "Not now"
if (user && justLoggedIn) setShowEnrollModal(true);

// CORRECT — check dismissal flag (24h cooldown)
if (user && justLoggedIn && !isEnrolled(user.phone) && !isEnrollmentDismissed()) {
  setShowEnrollModal(true);
}
```

### ❌ NEVER — Forget sessionStorage 'just-logged-in' cleanup
```js
// The enrollment modal shows using sessionStorage 'just-logged-in' flag
// MainLayout MUST remove it after showing the modal:
sessionStorage.removeItem('just-logged-in');

// Otherwise: if user navigates away and back to dashboard, modal reappears
```

---

## 10. Environment Variables Required

```bash
# Server (.env)
WEBAUTHN_RP_ID=getsales.maskpro.ph        # Must match your domain EXACTLY
WEBAUTHN_ORIGIN=https://getsales.maskpro.ph  # Must match the actual origin

# For local development:
# WEBAUTHN_RP_ID=localhost
# WEBAUTHN_ORIGIN=http://localhost:3000
```

No frontend env vars needed — the RP_ID and ORIGIN are handled server-side.

---

## 11. Security Properties

| Property | How It's Achieved |
|----------|------------------|
| Phishing resistant | WebAuthn binds credentials to the exact origin (RP_ID). Fake domains cannot use real credentials |
| No server-side secret | Private key never leaves the device's Secure Enclave / TPM |
| Replay resistant | Counter increments on every auth. Old signatures rejected |
| Single-use challenges | 5-minute TTL, deleted after use |
| User verification | `userVerification: 'required'` — device MUST verify biometric (not just presence) |
| No biometric data transmitted | Only a cryptographic signature is sent to server |

---

## 12. Summary: Full Data Flow Diagram

```
ENROLLMENT (after OTP login):
──────────────────────────────
LoginPage → OTP verified → navigate('/dashboard') + sessionStorage('just-logged-in', '1')
MainLayout loads → checks: isWebAuthnSupported() + !isEnrolled(phone) + !isEnrollmentDismissed()
  → setTimeout(800ms) → setShowEnrollModal(true)
BiometricEnrollModal appears
  [Enable Face ID] clicked
    → registerBiometric(token)
      → POST /auth/webauthn/register-options (JWT)
        ← { challenge, rpID, user, excludeCredentials }
      → startRegistration({ optionsJSON })
        ← OS shows "Enable Face ID for MaskPro GetSales?"
        ← User verifies → Device creates key pair
        ← credential returned (with public key, attestation)
      → POST /auth/webauthn/register-verify
        ← { verified: true }
    → setEnrolled(user.phone) → localStorage
    → sessionStorage.removeItem('just-logged-in')
  Success state shown → auto-close 2000ms

AUTHENTICATION (login):
──────────────────────────────
LoginPage loads
  → localStorage check: webauthn-enrolled has phone → setShowBiometric(true)
  → phone auto-filled if only one enrolled number
  [🔓 Use Face ID] clicked
    → authenticateWithBiometric(phone)
      → POST /auth/webauthn/login-options
        ← { options: { challenge, allowCredentials }, userId }
      → startAuthentication({ optionsJSON: options })
        ← OS shows "Sign in with Face ID"
        ← User verifies → Device signs challenge with private key
        ← credential returned (signed assertion)
      → POST /auth/webauthn/login-verify
        → Server: verify signature against stored public key
        → Server: check counter > stored counter (replay protection)
        → Server: update counter
        ← { accessToken, refreshToken, user }
    → biometricLogin(result) → Zustand store
    → navigate('/dashboard')
```

---

## 13. THE PROMPT

> Use this verbatim when instructing another IDE agent to implement WebAuthn biometric login:

---

```
You are implementing WebAuthn/Passkeys biometric login (Face ID, Touch ID, fingerprint) for a
Next.js 14 + Express.js web app called "MaskPro GetSales".

LIBRARY VERSIONS (must match exactly):
  Client: @simplewebauthn/browser @ ^9.x
  Server: @simplewebauthn/server @ ^9.x (+ @simplewebauthn/server/helpers)
⚠️ CRITICAL: Both packages MUST be the same major version.

DATABASE (MySQL):
CREATE TABLE webauthn_credentials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  credential_id VARCHAR(512) NOT NULL UNIQUE,  -- NOT VARCHAR(255), iCloud keys are long
  public_key TEXT NOT NULL,                     -- base64url encoded buffer
  counter BIGINT NOT NULL DEFAULT 0,
  device_name VARCHAR(255),
  transports JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

SERVER CONFIG (.env):
  WEBAUTHN_RP_ID=yourdomain.com          -- NO protocol, NO slash
  WEBAUTHN_ORIGIN=https://yourdomain.com  -- Full origin with protocol
  (for local dev: RP_ID=localhost, ORIGIN=http://localhost:3000)

BACKEND — 5 endpoints in /auth routes:
  POST /auth/webauthn/register-options (requires JWT auth) → return generateRegistrationOptions()
  POST /auth/webauthn/register-verify (requires JWT auth) → verifyRegistrationResponse(), store in DB
  POST /auth/webauthn/login-options (no auth) → generateAuthenticationOptions() for phone
  POST /auth/webauthn/login-verify (no auth) → verifyAuthenticationResponse(), return JWT
  GET  /auth/webauthn/has-credentials?phone= (no auth) → check if user has enrolled creds

CHALLENGE STORE — In-memory Map<userId, {challenge, expires}>. 5 min TTL. Clear after verification.
  ⚠️ Multi-process (PM2 cluster): Use Redis instead of Map.

REGISTRATION OPTIONS:
  authenticatorAttachment: 'platform'   -- REQUIRED: device biometrics only, not hardware keys
  userVerification: 'required'          -- REQUIRED: must verify biometric, not just presence
  residentKey: 'preferred'
  attestationType: 'none'
  excludeCredentials: [existing creds]  -- prevent duplicates

KEY CONVERSIONS (critical):
  STORING: isoBase64URL.fromBuffer(regCred.publicKey) → base64url string in DB
  READING: isoBase64URL.toBuffer(storedCred.public_key) → Buffer for verification
  Forgetting either = silent verification failure

ERROR HANDLING — InvalidStateError on enrollment = SUCCESS (credential already exists in iCloud Keychain)

FRONTEND SERVICE (lib/webauthnService.js):
  isWebAuthnSupported() → check window.PublicKeyCredential
  getBiometricType() → 'face-id' (iOS) | 'touch-id' (Mac) | 'fingerprint' (Android/Windows)
  setEnrolled(phone) / isEnrolled(phone) → localStorage 'webauthn-enrolled' JSON map
  dismissEnrollment() / isEnrollmentDismissed() → localStorage with 24h TTL
  registerBiometric(token) → 3 steps: get options → startRegistration() → verify
  authenticateWithBiometric(phone) → 3 steps: get options → startAuthentication() → verify + get JWT
  checkServerCredentials(phone) → server check for cross-device biometric button visibility

ENROLLMENT MODAL:
  Show 800ms after OTP login (via sessionStorage 'just-logged-in' flag)
  Conditions: isWebAuthnSupported() && !isEnrolled(phone) && !isEnrollmentDismissed()
  Handle: InvalidStateError → success, NotAllowedError → error message (user cancelled)
  After success: setEnrolled(phone), sessionStorage.removeItem('just-logged-in')
  "Not now" button: dismissEnrollment() → 24h cooldown before asking again

LOGIN PAGE BIOMETRIC BUTTON:
  Show if: localStorage has enrolled phones → auto-fill phone input
  Also check server: if phone typed + length=11 + !showBiometric → checkServerCredentials()
  Button: disabled if no phone. Dark bg (gray-900). Shows platform-specific label.
  Below button: "── Or login with ──" divider, then OTP tab (always available as fallback)
  NotAllowedError on login → "Biometric was cancelled" error (user tapped Cancel)

PLATFORM NOTES:
  iPhone: Face ID / Touch ID. iCloud Keychain syncs creds across Apple devices.
  Android: Fingerprint/face. Google Password Manager syncs across Android.
  Mac: Touch ID prompt in browser. Works on Safari + Chrome.
  Windows: Windows Hello (PIN/fingerprint/face). Works on Chrome + Edge.
  Firefox: WebAuthn works, Passkey sync limited. Graceful OTP fallback is enough.
  Linux Chrome: No biometric hardware → isWebAuthnSupported() is true but startRegistration throws.
    Handle by catching the error and falling back to OTP silently.
```
