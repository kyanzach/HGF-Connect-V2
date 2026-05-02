# Changelog

All notable changes to HGF Connect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.11.4] — 2026-05-02
### Fixed
- **Testimony AI Processing**: The `/api/ai/process-testimony` route was incorrectly calling the Google Gemini API (with a non-existent `GEMINI_API_KEY`) instead of using the project's Straico integration. Rewrote to use `api.straico.com/v1/prompt/completion` with `STRAICO_API_KEY` and `STRAICO_MODEL`, matching the pattern from the working caption and chat AI routes. Also added `force-dynamic` export and robust Straico response parsing with 3 fallback extraction paths.

## [v2.11.3] — 2026-04-29
### Fixed
- **TheWordTool**: Added `!important` to font-size, line-height, and background-color CSS declarations for `#prompter-scroll` children (`p`, `span`, `div`, `li`). This forces all text in the prompter view to display at the uniform, large size intended for presentation, overriding any inherited or inline styles from previously pasted rich text.

## [v2.11.2] — 2026-04-29
### Fixed
- **TheWordTool**: Added a paste event listener to the rich text editor to intercept pasted text and format it as plain text. This prevents external formatting (e.g. black text on a black background) from ruining the editor's default dark mode styling.

## [v2.11.1] — 2026-04-24
### Fixed
- Fixed missing "Share Testimony" link in the `UnifiedHeader` dropdown menu.

## [v2.11.0] — 2026-04-24
### Added
- **AI-Powered Testimony & Praise Report Module**
  - New database tables `testimonies` and `testimony_photos`
  - Member frontend at `/testimonies/create` for writing testimonies and uploading multiple optimized photos
  - Smart AI processing (Bisaya-to-English translation and auto-categorization via Gemini 1.5)
  - Admin/Announcer Dashboard at `/admin/testimonies` to filter testimonies by topic
  - Dedicated "Presentation View" optimized for Sunday service TV projection

## [v2.10.9] — 2026-04-03
### Added
- **TheWordTool: OG image & social sharing** — Scripture verse collage OG image (`og-thewordtool.png`) with full Open Graph and Twitter Card meta tags for rich link previews when shared on Messenger, Facebook, Twitter, etc.

## [v2.10.8] — 2026-04-03
### Added
- **TheWordTool: PWA support** — THE WORD can now be installed as a standalone app on tablets and phones via "Add to Home Screen". Includes:
  - PWA manifest (`thewordtool-manifest.json`) with dark theme, HGF icons, standalone display
  - Service worker (`thewordtool-sw.js`) with network-first caching for offline shell access
  - HGF favicon and apple-touch-icon for proper branding in browser tabs and home screen
  - Full Apple iOS PWA support meta tags (status bar, title, web-app-capable)

## [v2.10.7] — 2026-04-03
### Added
- **TheWordTool: Server File Manager** — Full-featured file manager modal with folder-based server storage for cross-device script sync (laptop → tablet). Features:
  - **Smart Save** (`⌘S`) — remembers save destination (local/server) per script title; first save prompts for choice, subsequent saves auto-route
  - **Save To Server** / **Save To Local** — explicit save buttons for manual override
  - **Open** — choice popup: open from local disk or browse server scripts
  - **Folder system** — create, rename, and delete folders on the server
  - **Password-locked folders** — set a password on any folder; only the person with the password can access scripts inside
  - **Server file browser** — dark-themed modal UI with breadcrumb nav, password prompt, and script management
- API routes: `app/api/thewordtool/route.ts` (script CRUD) and `app/api/thewordtool/folders/route.ts` (folder CRUD)
- `data/` directory excluded from deploy rsync (persists across deploys like `public/uploads/`)

## [v2.10.6] — 2026-04-03
### Added
- **Sister app documentation** — Added `§1b. Sister App` section to `.agents/docs/connect-hgf-reference.md` documenting that `app.houseofgrace.ph` (legacy PHP v1) lives on the same DigitalOcean droplet at `/var/www/hgf-legacy`. Also added sister app section to slim rules.
- **TheWordTool** (`public/thewordtool.html`) — Scripture delivery & timing teleprompter tool by Ryan Nantes Paco. Accessible at `connect.houseofgrace.ph/thewordtool.html`. Self-contained single-file HTML app with rich text editor, auto-scrolling prompter, session history, and timing features.

## [v2.10.5] — 2026-03-10
### Changed
- **Replaced all native `confirm()` dialogs with custom `ConfirmModal`** — native browser dialogs disappear instantly on PWA/mobile; new styled modal stays visible until user explicitly responds
  - Admin Events delete, Admin Members delete, Admin Review reject, Send SMS, StewardShop my-listings (remove/reactivate), StewardShop prospects (confirm sale, mark paid)
- Replaced `alert()` error feedback with inline error banners where applicable
### Added
- **`ConfirmModal` shared component** (`components/ConfirmModal.tsx`) — reusable confirmation modal with title, message, loading state, custom colors (red for destructive, teal for safe)
- **`.agents/rules/connect-hgf.md`** — comprehensive project-specific rules covering deployment, avoid patterns, Prisma gotchas, UI standards, troubleshooting flow

## [v2.10.4] — 2026-03-10
### Fixed
- **Admin events page crash** — `Application error: a client-side exception has occurred` on `/admin/events`. Root cause: Prisma returns `Date` objects for `eventDate`, `startTime`, `endTime`, etc., but Next.js App Router cannot serialize `Date` across the server→client boundary. Added `JSON.parse(JSON.stringify(...))` serialization before passing props to client components.
- Same fix applied to public `/events` page to prevent identical crash.

## [v2.10.3] — 2026-03-06
### Fixed
- Added `export const dynamic = "force-dynamic"` to all 6 StewardShop API routes
  - Fixes stale/empty data on Prospects, My Listings, My Shares, Love Gifts pages
  - Root cause: Next.js was aggressively caching GET responses
### Added
- Pull-to-Refresh gesture for the entire app
  - Drag down from the top of any page to trigger a hard reload
  - SVG refresh spinner with teal theme, resistance curve, and threshold-based activation
  - Works with overflow scroll containers (not just window scroll)

## [v2.10.2] — 2026-03-06
### Changed
- Rewrote `VersionGuard` from forced auto-reload to a polite update modal
  - Shows centered modal: "Application Update v2.10.1 → v2.10.2"
  - User can click "Update Now" (clears caches + reloads) or "Later" (dismisses for session)
  - Prevents interrupting users who are mid-typing or filling forms
- Improved Service Worker update lifecycle
  - Added visibility and `online` event listeners to pause/resume polling
  - Ensure reload happens only after new SW controls the page

## [v2.10.1] — 2026-03-06
### Added
- `GET /api/version` — returns current deployed version (force-dynamic, no-cache)
- `VersionGuard` component — proactive auto-refresh for PWA/webapp clients
  - Polls `/api/version` every 60s (pauses when tab not visible)
  - On mismatch: forces SW update → clears all caches → hard reload
  - `sessionStorage` loop protection (only reloads once per version)
  - Offline-safe (skips check when `navigator.onLine` is false)
  - Race condition guard (`isChecking` ref)

### Changed
- Root layout: added `suppressHydrationWarning`, `antialiased`, auth fault tolerance

## [v2.10.0] — 2026-03-05
### Added
- `PATCH /api/marketplace/love-gifts/{claimId}/received` — sharer confirms receipt
- Auto-feed celebration post on Love Gift received (MEMBERS_ONLY, linked to StewardShop)
- Thank You note prompt (optional textarea) → included in seller notification
- ReceiptModal with "Confirm Receipt" button on My Share Links
- Milestone badges (7 badges: First Share, First Prospect, First Love Gift, First Receipt, 5 Shares, 10 Prospects, 3 Love Gifts)
- Admin Love Gifts page (`/admin/stewardshop/love-gifts`) with summary stats grid + filter tabs + claims table
- `GET /api/admin/love-gifts` — admin-only endpoint with claim summaries
- Added "❤️ Love Gifts" Quick Action link on Admin Dashboard
- Notification #7: Receipt confirmed → seller (includes thank-you note if provided)

### Changed
- Replaced "Please confirm receipt (Session 3)" placeholder with real Confirm Receipt button
- Idempotency guard added to `/received` endpoint (already-received returns success instead of error)

## [v2.9.0] — 2026-03-05
### Added
- `POST /api/marketplace/love-gifts/claim` — sharer submits GCash or contact request
- `PATCH /api/marketplace/love-gifts/{claimId}/pay` — seller marks claim paid
- Request Love Gift modal with GCash + Contact Seller tabs
- Smart GCash auto-fill from member profile, auto-save on submit
- GCash validation (11 digits, starts with 09)
- Love Gift Wallet Summary on My Share Links (earned/pending/paid/sales)
- Winner banners for other sharers ("Karen won ₱X!")
- Sold state visuals on My Share Links (greyed photos, SOLD badge)
- Love Gift Claims section on Prospects page (GCash details + Mark as Paid)
- Rotating Bible verse quotes (diligence) on My Share Links
- Notification #4: GCash claim → seller ("Karen requests ₱X via GCash")
- Notification #5: Contact claim → seller ("Karen wants to discuss Love Gift")
- Notification #6: Mark as paid → sharer ("Seller sent ₱X! Confirm receipt")

### Changed
- Enhanced `GET /api/marketplace/shares/mine` with claim data, winner info, seller contact, wallet totals
- Enhanced `GET /api/marketplace/listings/{id}/prospects` with Love Gift claims for seller view

## [v2.8.0] — 2026-03-05
### Added
- Unified `POST /api/marketplace/listings/{id}/mark-sold` endpoint with `$transaction` safety
- Mark Sold modal with prospect radio selector and "Sold outside" option
- Love Gift auto-crediting to sharer when sale confirmed via prospect
- Notifications to winning sharer and other sharers on sale
- Sold state visuals: greyed-out cards, SOLD overlay, CTA hiding on public listing
- Rotating Bible verse quotes for honesty on My Listings page
- `love_gift_claims` table for tracking Love Gift claim lifecycle
- `gcash_name` and `gcash_mobile` fields on `members` table
- `sold_prospect_id` field on `marketplace_listings` for buyer tracking
- 5 new `NotificationType` enum values for Love Gift lifecycle
- Reactivation guard: blocks reactivating listings with credited Love Gifts
- Self-referral prevention: sellers can't credit themselves

### Changed
- Removed old `mark_sold` action from PATCH listings route (now unified endpoint)
- Sold listings now viewable (not 404) with sold overlay and "Browse StewardShop" CTA
- Reactivation now clears `soldProspectId` on success

## [v2.7.0] — 2026-03-03

### Added
- **Short link domain `hgfapp.link`** — Share links now use `hgfapp.link/s/{code}` instead of the full connect.houseofgrace.ph URL. Coupon code is hidden from the shared link. Direct access to `hgfapp.link` redirects to `houseofgrace.ph`.
- **`/s/[code]` redirect route** — Resolves share codes from `listing_shares`, records an impression, and 302 redirects to the listing page.
- **🫰 My Share Links** — New menu item in the sidebar dropdown below "My Listings".

### Changed
- **Coupon card text** — Renamed to "YOUR DISCOUNT CARD", updated instructions to "SCREENSHOT this! Show this discount card to the seller at purchase time."
- **Share CTA visibility** — "Share this listing" text now hidden for non-logged-in/public users.
- **Native share message** — No longer exposes coupon code in the shared text.

---

## [v2.6.0] — 2026-02-28

### Fixed
- **Admin events edit button broken** — Time fields from Prisma were parsed as UTC, causing wrong pre-fill values. Rewrote with robust `toHHMM()` helper using `Asia/Manila` timezone. Added try-catch error handling to save/delete operations.
- **Event posts deletable from feed** — EVENT-type posts no longer show "Delete Post" in the three-dot menu. Events can only be deleted from admin Events Management.

### Added
- **HeroCarousel cover photo** — Upcoming event slide now shows the event's cover photo as background with dark gradient overlay (`rgba(15,45,61,0.85)` → `rgba(26,90,118,0.75)`). Falls back to teal gradient when no photo. Decorative circles hidden when cover photo is active.

---

## [v2.5.9] — 2026-02-28

### Added
- **Event cover photo system** — `coverPhoto` column on events table, upload API, admin form with photo upload/preview/remove, auto-post to feed includes cover photo.
- **Enhanced event feed card** — EVENT posts render with styled card (gradient or cover photo bg), white text with shadow, "View Event →" CTA linking to event detail page.
- **Slick event detail page** — Compact header, full-width cover photo below header, OG meta tags with cover image.

### Fixed
- **My-shares API URL** — Hardcoded production URL, changed `/marketplace/` to `/stewardshop/` in share links.

---

## [v2.5.8] — 2026-02-28

### Fixed
- **Admin event cards** — Show cover photo thumbnail and View button.
- **Event menu shortcut** — Added clickable event feed cards linking to detail page.

---

## [v2.5.7] — 2026-02-28

### Fixed
- **Carousel auto-advance** — Reduced interval from 6s to 3s for snappier feel.

---

## [v2.5.6] — 2026-02-27

### Fixed
- **Broken listing photos** — The URL rename accidentally changed `/uploads/marketplace/` to `/uploads/stewardshop/` in 7 files. Reverted to `/uploads/marketplace/` (disk path unchanged).
- **Old URL redirect** — Added permanent 308 redirect from `/marketplace/*` → `/stewardshop/*` in `next.config.js` so old shared links and bookmarks still work.

---

## [v2.5.5] — 2026-02-27

### Changed
- **URL rename** — All `/marketplace` URL paths renamed to `/stewardshop`. Route directories, navigation links, share API links, and all internal references updated. API routes kept at `/api/marketplace/` (internal). Upload paths kept at `/uploads/marketplace/` (disk storage).

---

## [v2.5.4] — 2026-02-27

### Fixed
- **Share link URL** — Was generating `http://localhost:3000` links because `NEXT_PUBLIC_APP_URL` env var was set to localhost. Now hardcoded to production URL.
- **Love Gift badge position** — Moved from top-right to bottom-right on listing detail page (matching grid position).
- **Edit listing photos** — Photos were read-only. Now supports deleting individual photos (✕ button) and adding new ones (+ Add Photos). PATCH API updated to sync `photoPaths` array.

---

## [v2.5.3] — 2026-02-27

### Fixed
- **Unique view counting** — View count now increments only once per unique IP per listing per 24 hours (MD5-hashed IP stored in MarketplaceImpression).
- **Owner sees revealed discount** — CouponRevealCard was not gated by `!isOwner`. Stale localStorage entries from previous reveals are now auto-cleared when the owner views their own listing.

---

## [v2.5.2] — 2026-02-27

### Fixed
- **Marketplace grid** — Always shows original price only (no strikethrough, no DEAL badge). Love Gift badge moved to bottom-right and only visible to logged-in members.
- **Listing detail** — Love Gift badge, discount hint, reveal button, and share CTA all conditionally visible based on viewer type (owner/member/public) and referral state.
- **Self-referral guard** — Members clicking their own share link are treated as direct browse (no discount, no self-Love-Gift). Owner ref is always stripped.

---

## [v2.5.1] — 2026-02-27

### Fixed
- **Self-praying blocked** — Users can no longer pray for their own prayer request. API returns 403; prayer wall shows "✏️ Your Request" label instead of the Pray button.
- **Voice prayer audio not displaying** — Audio URL regex was too strict (`prayer_\d+_\d+`) and didn’t match actual filenames from the upload endpoint. Relaxed to `prayer_[\w]+`.

---

## [v2.5.0] — 2026-02-27

### Added
- **Prayer commitment system** — Clicking 🙏 Pray now opens a full commitment modal with encouraging text, optional text message, and voice recording (max 60s WebM). Members can truly commit to pray, not just click a counter.
- **Prayer detail page** (`/prayer/[id]`) — Shows the full prayer request, who prayed (with profile pictures, timestamps), playable voice messages, and a Pray button.
- **Prayer Warrior badges** — Auto-evaluated after each prayer: Level I (10+ prayers), Level II (50+ prayers + 5 voice), Level III (100+ prayers + 15 voice + 25 unique members). Self-prayers excluded from unique count.
- **Audio upload API** (`/api/prayer/upload-audio`) — Saves voice prayers to `/uploads/prayer_audio/`.
- **Prayer responses API** (`/api/prayer/[id]/responses`) — Lists who prayed with author info and audio URLs.

### Security (OpenCode Opus 4.6 review)
- Pray API: NaN guard, existence check, user status check, atomic transaction, audioUrl validation, message cap (500 chars), parallelized badge queries, self-prayer exclusion.

---

## [v2.4.1] — 2026-02-27

### Added
- **Dashboard hero carousel** — Welcome section is now a swipeable carousel with 3 dynamic slides: Welcome/verse (always), Upcoming Event (if available), Prayer Spotlight (if active requests exist). Auto-advances every 6s, dot indicators hidden when only 1 slide.
- **Schema: PrayerResponse.audioUrl** — New column for voice prayer messages.
- **Schema: MemberBadge** — New table for Prayer Warrior badge system (and future badges).

---

## [v2.4.0] — 2026-02-27

### Added
- **Events auto-post to Community Feed** — When an admin creates a new event, a feed post of type `EVENT` (📅) is automatically created with the event title, date, time, location, and description. Shows as "📅 Event" in the feed, not "Reflection".

---

## [v2.3.9] — 2026-02-27

### Fixed
- **Marketplace images broken site-wide** — All 6 marketplace pages used `next/image` `<Image fill>` for `/uploads/marketplace/` paths, causing broken images on the sell page, listing grid, detail carousel, edit page, my-listings, and my-shares. Replaced with plain `<img>` using absolute positioning.

---

## [v2.3.8] — 2026-02-27

### Fixed
- **Post type labels wrong** — Photo upload posts showed "✍️ Reflection" instead of "📷 Profile Photo" / "🖼️ Cover Photo". Added `PROFILE_PHOTO` and `COVER_PHOTO` entries to `PostCard` TYPE_LABELS.
- **Header avatar auto-refresh** — After uploading a new profile picture, the header now updates immediately (no logout required). Added `session.update()` call after upload and JWT callback re-fetches `profilePicture` from DB on update trigger. Reviewed by OpenCode Opus 4.6 — confirmed safe.

---

## [v2.3.7] — 2026-02-27

### Fixed
- **Photo uploads completely broken** — Prisma client on server was generated from old schema without `@map('file_name')` directives. Every `memberPhotoHistory` query failed with `column fileName does not exist`. Regenerated Prisma client on server.
- **Post images broken on wall feed** — `PostCard.tsx` double-prefixed `/uploads/` to `post.imageUrl` which already starts with `/uploads/`. Replaced `next/image` with plain `<img>` for upload paths.
- **Header avatar stale after photo upload** — JWT session stores profile picture at login time; `window.location.reload()` doesn't refresh the JWT token.

---

## [v2.3.6] — 2026-02-27

### Fixed — Critical caption save and version badge bugs (OpenCode Opus review)
- **Caption save appearing to fail silently** — 3 interrelated bugs found by Claude Opus 4.6:
  1. `PhotoPostViewer.tsx`: Caption state stored as scalar (`localCaption`) was reset to null on every photo swipe. Replaced with index-keyed map (`savedCaptions`) so captions persist across navigation.
  2. `photo/route.ts`: Upload handler created duplicate archive history rows (with `caption: null`) that shadowed existing captioned rows. Added `findFirst` guard.
  3. `photo-history/route.ts`: Restore handler had same duplicate archive bug. Same fix applied.
- **Version badge stuck at v2.3.0** — `service-worker.js` CACHE_NAME was hardcoded at `hgf-connect-v2.3.0`. Old SW cache served stale JS/HTML indefinitely. Bumped to v2.3.6 and added `prebuild` npm script to auto-sync SW version from `package.json` on every build.

---

## [v2.3.5] — 2026-02-27

### Fixed
- **Profile edit page: broken cover photo preview** — cover photo URL pointed to `/uploads/profile_pictures/` instead of `/uploads/cover_photos/`. This is why the cover photo thumbnail showed a broken image icon on the edit page while the profile page worked fine.
- **Profile edit page: replaced all `next/image` with plain `<img>`** — both profile photo and cover photo previews now use plain `<img>` tags for `/uploads/` paths.

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
