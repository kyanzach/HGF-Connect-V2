# Changelog

All notable changes to HGF Connect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.3.4] — 2026-02-27

### Fixed
- **Version badge now dynamic**: Was hardcoded as `v2.3.0` in both `AppHeader.tsx` and `PublicNav.tsx`. Now reads from `package.json` via `NEXT_PUBLIC_APP_VERSION` env var in `next.config.js` — auto-syncs with every bump.
- **Caption save for profile photos**: `member_photo_history.file_name` had `.jpeg` extension but `members.profile_picture` had `.jpg` — PATCH handler couldn’t find the matching row, so caption saves silently failed. Fixed all 31 rows to match the `members` table.

---

## [v2.3.3] — 2026-02-27

### Fixed
- **deploy.sh wiping uploads on every deploy (critical bug)**: `rsync --delete` was overwriting the server's `public/uploads/` with the local empty directory on every deploy, destroying all uploaded profile and cover photos. Added `--exclude public/uploads` to the rsync command. Also added `--exclude .next.prev` and `--exclude .next.failed` to protect server-only rollback snapshots.
- **Cover photos for all members**: Re-moved 22 `cover_*` files to `cover_photos/` after the root cause was identified. This time they will survive future deploys.

---

## [v2.3.2] — 2026-02-27

### Fixed
- **Cover photos (all members)**: Root cause found — `cover_photos/` directory was empty on live server. All cover files were still in `profile_pictures/`. Moved 22 `cover_*` files correctly via SSH. HTTP 200 verified for all members.
- **Member 2 cover photo restored**: `cover_2_1750684124.jpg` exists on server and DB value restored from NULL.

### Changed
- **Directory completeness score**: Profile photo now worth +5 pts, cover photo now worth +5 pts (previously +2 each). Rest of profile fields remain +1 each. Also added `ageGroup`, `joinDate`, and `ministries` to the scoring so more fields count toward completeness.
- **Directory page**: Replaced `next/image` `<Image>` with plain `<img>` for avatar photos (fixes potential 400 errors from Next.js image optimizer).

---

## [v2.3.1] — 2026-02-27

### Fixed
- **Cover photo folder**: Moved 22 `cover_*` files from `profile_pictures/` → `cover_photos/` on live server (files were uploaded to wrong directory, causing broken images site-wide)
- **DB filename extension mismatch**: All `profile_picture` and `cover_photo` DB values stored as `.webp` but actual files were `.jpg`/`.jpeg`/`.png`. Fixed all rows in `members` and `member_photo_history` tables via mysql CLI
- **Prisma client stale**: `memberPhotoHistory` model was missing from the generated Prisma client on server (causing 500 errors on `GET/PATCH /api/members/[id]/photo-history`). Fixed by running `prisma generate` via deploy.sh

---

## [v2.3.0] — 2026-02-24

### Added
- **Sharp WebP image pipeline**: All image uploads (profile photos, cover photos, marketplace listings) are now automatically converted to WebP using Sharp before saving. Input limit raised to 10 MB; output is compressed to <150 KB regardless of original size. No raw JPEGs ever reach the server disk again
- **Profile photo thumbnails**: At upload time, a 80×80 WebP thumbnail (`_thumb_`) is generated alongside the full 400×400 photo. Used in directory card grids — saves loading 400px images where only 80px is shown
- **`lib/processImage.ts`**: Shared Sharp utility centralising all compression logic. Any future feature involving image upload must route through this — enforced in `deploy.sh` release checklist (items 7 & 8)
- **Image migration script** (`scripts/migrate-images-to-webp.mjs`): One-time script with `--dry-run` mode that converted all existing server images to WebP, updated DB filenames, and deleted originals. Supports profile, cover, and marketplace photo types
- **nginx `Cache-Control: immutable`**: `/uploads/` now served directly by nginx (bypassing Node.js) with `public, max-age=2592000, immutable` — 30-day browser cache. Safe because filenames include timestamps — new upload = new URL = automatic cache-bust
- **Pinch-zoom disabled**: Added `maximumScale: 1, userScalable: false` to the viewport export — prevents accidental zoom that hides UI elements (same approach as GetSales PWA)

### Changed
- **All 33 existing server images migrated**: 34 MB of JPEGs → 4.4 MB WebP (-87% disk usage). Cover photos resized to 1200×400 (`fit: cover`), profile photos to 400×400, originals deleted
- **`/uploads/` served by nginx directly**: Removed from the Next.js proxy path — faster static file serving with proper cache headers
- **Member profile back/edit buttons redesigned**: Replaced large "← Directory" and "✏️ Edit" pill buttons overlaid on the cover photo with small 36px frosted-glass circle icons. Moved from `bottom` to `top` of cover so they are not hidden behind the avatar overlap
- **PWA icon background**: All 4 icon PNGs (180, 192, 512, maskable-512) had transparent corners composited to white. `manifest.json` `background_color` changed from `#4EB1CB` → `#ffffff` — iOS home screen icon now has correct white background

### Fixed
- **PublicNav version badge**: Was stuck at `v2.0.1` — now shows correct version (`v2.3.0`). Added to release checklist so both `AppHeader` and `PublicNav` are updated together on every release
- **Member profile back button hidden behind avatar**: Button was positioned at `bottom` of cover div, exactly where the avatar's `-44px` margin overlap hides it. Moved to `top: 0.875rem` — now always visible
- **Safe-area padding on PublicNav**: Added `paddingTop: env(safe-area-inset-top)` — nav bar no longer overlaps iPhone notch/island on Directory and Member Profile pages

---

## [v2.2.0] — 2026-02-23

### Added
- **PWA Install Modal**: Full-featured install prompt ported from MaskPro GetSales — handles iOS Safari (step-by-step guide), iOS Chrome (copy link to Safari), Android Chrome (native `beforeinstallprompt`), and desktop. Shows real HGF logo. 1-day dismiss cooldown + permanent "already installed" option
- **Staggered modal flow**: PWA install modal shows first (1.2s after login), then biometric enrollment modal (after PWA is handled). Only one modal visible at a time — never stacked
- **Usernameless biometric login (Passkeys)**: WebAuthn discoverable credentials — Face ID / Touch ID on login page requires no username. Device auto-discovers its own credential. Silent fallback if credential not found, error message only on deliberate cancel (`NotAllowedError`)
- **`beforeinstallprompt` capture**: `ServiceWorkerRegistration` now captures the browser install event globally so `PWAInstallModal` can trigger native Android/desktop install

### Changed
- **Login redirects to `/feed` directly** (was `/`) — AppLayout territory where modals fire immediately
- **`residentKey: "preferred"` → `"required"`** in WebAuthn registration — all new enrollments create discoverable credentials
- **Biometric button moved to top of login card** — prominent teal button, no username required
- Login page biometric button only appears if device has an enrolled credential (`hasAnyEnrolledDevice()` check)

### Fixed
- **App header safe area**: Added `paddingTop: env(safe-area-inset-top)` — header no longer overlaps iPhone status bar / notch
- **HGF icon white background**: Both app header and PWA modal now show the HGF logo inside a white rounded container — no dark border artifact
- **Version badge**: `AppHeader` now shows correct version (was hardcoded `v2.0.1`)

---

## [v2.1.1] — 2026-02-23


### Fixed
- **Biometric login**: `authorize()` in `lib/auth.ts` now handles the `biometricVerified` + `memberId` credentials path — previously returned `null` immediately (no password), causing "Sign-in failed after biometric" error

---

## [v2.1.0] — 2026-02-23

### Added
- **PWA**: Install HGF Connect to home screen on iOS & Android — standalone mode, offline fallback, service worker caching, 4 icon sizes, UpdateToast
- **Biometric Login (WebAuthn)**: Face ID (iPhone) / Fingerprint (Android) enrollment modal after first login, `webauthnService.ts` client helpers, EnrollTrigger in AppLayout
- **Submit Button UX**: Animated spinner on loading, button shakes on empty validation, animated error banner — applied to devo, prayer, journal, feed forms via reusable `SubmitButton` component
- **Deploy infrastructure**: `deploy.sh`, `ecosystem.config.js`, `CHANGELOG.md`

---

## [v2.0.1] — 2026-02-22

### Added — Data Migration & Live Deploy

#### Data Migration (Real Production Data)
- Imported full SQL backup (`hgfapp-353032350995.sql`) with all production members, events, attendance records, SMS logs, and ministries
- Copied 34 member profile pictures from old PHP app uploads to `public/uploads/profile_pictures/`
- Copied 15 Sunday Word PDF resources to `public/uploads/sunday_word/`

#### UI Changes
- Home page redesigned to match old PHP site (2-col layout, features card, sticky sidebar)
- Marketplace page updated with exact old-site content (Coming Soon, 3 feature cards, daily bible verse)
- `PublicNav` updated: HGF icon, v2.0.1 badge, old-site nav links (Home, Member Directory, Events, Marketplace, Resources)
- `/marketplace` route made public (no login required) — matches old site behavior

#### Infrastructure
- `next.config.ts` updated to serve uploads as static assets from `public/uploads/`
- First live deployment to DigitalOcean Droplet (159.65.15.225)

---

## [v2.0.0] — 2026-02-22


### Added — Initial Next.js 14 Rewrite

This is the complete greenfield rewrite of HGF Connect from PHP/Bootstrap to Next.js 14 (App Router) + TypeScript + Tailwind CSS v4.

#### Framework & Infrastructure
- Next.js 16 (App Router) with TypeScript
- Tailwind CSS v4 with HGF brand tokens (`--color-primary: #4EB1CB`)
- Prisma ORM v5 with MySQL 8 adapter
- NextAuth.js v5 (beta) with credentials provider and JWT strategy
- Self-hosted on DigitalOcean Droplet (Node.js 25, PM2, Nginx) — first deploy pending

#### Authentication
- `lib/auth.ts` — NextAuth v5 credentials provider (username OR email + bcrypt)
- `middleware.ts` — Role-based route protection (admin, moderator, usher, user, pending)
- `types/next-auth.d.ts` — Extended session types (role, status, firstName, lastName)
- JWT strategy: role, status, profilePicture in token

#### Data Layer
- `prisma/schema.prisma` — Complete schema mapping all legacy MySQL tables:
  - `members`, `events`, `attendance_records`, `ministries`, `member_ministries`
  - `member_status_history`, `sms_reminders`, `sms_logs`, `sms_batch_stats`
  - `custom_sms_batches`, `custom_sms_batch_recipients`, `app_logs`
  - All marketplace tables: `marketplace_listings`, `marketplace_listing_photos`, `marketplace_messages`, `marketplace_reports`
- `lib/db.ts` — Prisma client singleton (prevents hot-reload connection exhaustion)
- `lib/utils.ts` — Ported PHP helpers: `formatPhoneNumber`, `formatDate`, `formatDateTime`, `formatTime`, `getManilaTime`, `generateUsername`, `sanitizeOutput`, label maps

#### Public Pages (SSR with OG metadata)
- `/` — Home page: hero with live stats, feature grid, upcoming events preview, footer
- `/login` — Login form with NextAuth credentials
- `/register` — Registration form (status: pending, bcrypt password)
- `/events` — Event list (upcoming + past) with type icons and color coding
- `/event/[id]` — Event detail with dynamic OG metadata
- `/directory` — Member directory grid with avatar, type badge, ministry tags
- `/marketplace` — "Coming Soon" stub with feature preview
- `/resources` — Resource library placeholder

#### Authenticated Pages
- `/dashboard` — Member dashboard (pending status banner, profile info, quick links)

#### Admin Pages
- `/admin` — Dashboard with stats (active/pending members, events, SMS), audit log, quick actions

#### API Routes
- `POST /api/members` — Self-registration (generates username, bcrypt hashes password)
- `GET /api/members` — List with search/filter/pagination + privacy filtering for non-admins
- `GET/PATCH/DELETE /api/members/[id]` — CRUD (admin or self for edits)
- `GET /api/members/search` — Typeahead search
- `GET/POST /api/events` — Event list + create (admin/mod only)
- `GET/PATCH/DELETE /api/events/[id]` — Event CRUD
- `GET /api/events/current` — Current/next event for attendance kiosk
- `POST /api/attendance/record` — Record attendance (admin/mod/usher)
- `GET /api/attendance/stats` — Today/week/month counts

#### Layout Components
- `components/layout/PublicNav.tsx` — Sticky nav with session-aware links and role-based admin link
- `components/layout/AdminSidebar.tsx` — Collapsible sidebar with active state highlighting
- `app/admin/layout.tsx` — Admin layout with server-side role guard

---

*v1.x is the legacy PHP codebase at `app.houseofgrace.ph/`. v2.x is this Next.js rewrite.*
