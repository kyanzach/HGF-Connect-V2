# Changelog

All notable changes to HGF Connect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.1.0] — 2026-02-23

### Added
- **PWA**: Install HGF Connect to iPhone home screen — standalone mode, offline fallback, service worker caching, 4 icon sizes, UpdateToast
- **Biometric Login (WebAuthn)**: Face ID / Touch ID enrollment modal after first login, `webauthnService.ts` client helpers, EnrollTrigger in AppLayout
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
