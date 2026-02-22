# HGF Connect — System Knowledge Base

> **Purpose:** This document is the canonical reference for the HGF Connect church management system.
> It is written for a new agent or engineer tasked with understanding or rewriting this system in **Next.js**.
> Read this file first, then consult referenced source files as needed.

---

## 1. Project Summary

**HGF Connect** is a full-stack church management web application for **House of Grace Fellowship**, a local church in **Davao City, Philippines**.

It handles:
- Member profiles, status, and directory
- Event creation and management
- SMS reminder automation (4-step sequences)
- Attendance tracking (separate app, SSO-linked)
- Ministry management
- Marketplace listings
- Role-based admin panel
- Audit logging

---

## 2. Local Development Environment

| Item | Value |
|------|-------|
| **Platform** | XAMPP (macOS) |
| **Local root** | `/Applications/XAMPP/xamppfiles/htdocs/app.houseofgrace.ph/` |
| **Local URL** | `http://localhost/app.houseofgrace.ph/` |
| **Live URL** | `https://app.houseofgrace.ph/` |
| **PHP version** | 8.x (XAMPP bundled) |
| **MySQL** | XAMPP bundled MariaDB |
| **Database name** | `hog_fellowship` |
| **Database host** | `localhost` |
| **DB user (local)** | `root` (no password) |
| **DB user (live)** | Set via environment/server config |
| **Server timezone** | London UTC (live) — code forces `Asia/Manila` |
| **Git repo** | `https://github.com/kyanzach/HGFConnect` |
| **Branch** | `main` |

### To connect to the local DB (phpMyAdmin or CLI):
```
mysql -u root hog_fellowship
```
Or open `http://localhost/phpmyadmin` in your browser while XAMPP is running.

---

## 3. Tech Stack

### Current Stack (PHP / Legacy)
| Layer | Technology |
|-------|-----------|
| Language | PHP 8.x (no framework, procedural + include-based routing) |
| Frontend | HTML5, Bootstrap 5, vanilla JavaScript, Font Awesome 6 |
| CSS | Vanilla CSS (`assets/css/style.css`) |
| Database | MySQL / MariaDB via PDO |
| Routing | Single entry point `index.php` — reads `?page=xxx` GET param |
| Authentication | PHP sessions (`PHPSESSID`) with SSO to Attendance app |
| SMS | SMS-it API (SIM-based gateway, Philippine number) |
| Cron | Linux cron on the live server, XAMPP `cron/` scripts locally |
| File uploads | `uploads/` directory (profile pics, cover photos, resources) |

### Target Stack (Next.js Rewrite)
| Item | Recommended |
|------|-------------|
| Framework | **Next.js 14** (App Router) |
| Rendering | Server Components (SSR/SSG) + Client Components where needed |
| Routing | **Next.js App Router** — `app/` directory, file-based routes |
| State | **Zustand** (client state) + **React Query / SWR** (server state cache) |
| Styling | **Tailwind CSS v3** |
| API Layer | **Next.js Route Handlers** (`app/api/*/route.ts`) — replace PHP AJAX endpoints |
| Auth | **NextAuth.js v5** (session + JWT, replace PHP sessions) |
| ORM | **Prisma** (MySQL adapter, replaces raw PDO) |
| SMS | Keep PHP cron scripts OR a separate Node.js service — SMS-it API preserved |
| File uploads | **AWS S3** or **Cloudflare R2** (replace `/uploads` directory) |
| Deployment | **DigitalOcean Droplet** (Ubuntu 22.04 + Node.js 20 + PM2 + Nginx + MySQL + PHP cron) |

> [!NOTE]
> **Targeted Hybrid Architecture option:** For public-facing pages that benefit from SSR/SEO (Home, Events, Member Directory, Event Detail, Resources), use **Next.js**. For auth-gated admin dashboards and interactive pages where SSR has no SEO benefit, a **Vite SPA** pattern can be retained if already built. This avoids rewriting working admin screens unnecessarily. Example: Attendance reports, custom SMS composer, and the D3/chart-heavy dashboard pages are good candidates to stay as Vite SPA. The Join/Register flow, event listings, member directory, and marketplace browse pages are good candidates for Next.js SSR (better SEO + OG tags).

---

## 4. File & Folder Structure

```
app.houseofgrace.ph/
├── index.php                  ← Single entry point (routes via ?page=)
├── CHANGELOG.md               ← Version history (semver)
├── SYSTEM.md                  ← THIS FILE — system knowledge base
│
├── config/
│   ├── config.php             ← BASE_URL detection, HTTPS redirect, cache busting
│   ├── database.php           ← PDO connection, sets MySQL timezone to +08:00
│   └── sms.php                ← SMS-it API keys, CHURCH_TIMEZONE, all SMS templates
│
├── includes/
│   └── auth.php               ← Auth functions: isLoggedIn, hasRole, authenticateUser, SSO
│
├── utils/
│   ├── functions.php          ← Helpers: writeToLog, formatDate, sanitizeInput, formatPhoneNumber
│   ├── sms.php                ← sendSms(), createEventReminders(), createReminderMessage()
│   ├── sms_batch_monitor.php  ← Batch monitoring utilities
│   └── app_logger.php         ← DB audit logger (app_logs table)
│
├── ajax/
│   ├── user_actions.php       ← AJAX: member CRUD, status changes, profile updates
│   └── sms_actions.php        ← AJAX: SMS batch management, retry, status queries
│
├── cron/
│   ├── send_reminders.php     ← Reads sms_reminders → queues into custom_sms_batches
│   ├── process_custom_sms_batches.php  ← Sends 10 SMS per run via SMS-it API
│   └── clean_logs.php         ← Log file cleanup
│
├── views/
│   ├── includes/
│   │   ├── header.php         ← HTML head, Bootstrap, CSS
│   │   ├── navigation.php     ← Top navbar (role-aware links)
│   │   └── footer.php         ← JS includes, Bootstrap bundle
│   ├── pages/                 ← One file per page (see Section 5)
│   └── partials/
│       ├── events_table_head.php  ← Shared <thead> for events tables
│       └── events_table_row.php   ← Shared <tr> for events tables
│
├── assets/
│   ├── css/style.css          ← Main stylesheet (Bootstrap overrides + custom)
│   ├── js/                    ← Any page-specific JS files
│   └── img/                   ← Logo, default avatars, etc.
│
├── database/
│   ├── schema.sql             ← Full DB schema (source of truth)
│   └── add_custom_sms_batch_processing.sql  ← Custom SMS batch tables
│
├── uploads/
│   ├── profile_pictures/      ← Member profile photos
│   └── sunday_word/           ← PDF uploads for Sunday Word resources
│
└── logs/                      ← File-based logs (custom_sms_YYYY-MM-DD.log, etc.)
```

---

## 5. Pages Reference

All pages live in `views/pages/`. The router in `index.php` maps `?page=` to the filename.

### Public Pages (no login required)

| URL | File | Description |
|-----|------|-------------|
| `?page=home` | `home.php` | Landing page — church info, upcoming events, member CTA |
| `?page=login` | `login.php` | Login form (username or email + password), handles POST |
| `?page=register` | `register.php` | Self-registration form — creates member with `status=pending` |
| `?page=member-directory` | `member-directory.php` | Searchable public member list (privacy-filtered) |
| `?page=member-events` | `member-events.php` | Public event listings for non-logged-in visitors |
| `?page=member-profile` | `member-profile.php` | Public profile view for a single member (`?id=`) |
| `?page=event-details` | `event-details.php` | Public event detail view (`?id=`) |
| `?page=resources` | `resources.php` | Sunday Word PDFs and church resources |

### Authenticated User Pages (any logged-in role)

| URL | File | Description |
|-----|------|-------------|
| `?page=user-dashboard` | `user-dashboard.php` | Landing for pending/low-privilege users — shows member info |
| `?page=profile` | `profile.php` | Own profile edit: photo, cover photo, password, privacy settings |
| `?page=marketplace` | `marketplace.php` | Church marketplace — buy/sell listings |

### Admin/Moderator Pages (requires `admin` or `moderator` role)

| URL | File | Description |
|-----|------|-------------|
| `?page=dashboard` | `dashboard.php` | Admin overview: member stats, recent activity, quick actions |
| `?page=members` | `members.php` | Full member management: search, filter, add, edit, status change, import CSV |
| `?page=events` | `events.php` | Event management: add/edit/delete events, upcoming + past sections, SMS reminder toggle |
| `?page=sms` | `sms.php` | SMS dashboard: logs, batch stats, retry failed messages |
| `?page=send-sms` | `send-sms.php` | Custom SMS composer: select recipients, write message, queue batch |
| `?page=ministries` | `ministries.php` | Ministry management: create/edit ministries, member assignments |
| `?page=users` | `users.php` | User account management (admin only) |
| `?page=review-actions` | `review-actions.php` | Pending approval queue (ministry join requests, registrations) |

### Special Pages

| URL | File | Description |
|-----|------|-------------|
| `?page=logout` | `logout.php` | Destroys session + attendance SSO session, redirects to login |
| `?page=404` | `404.php` | Not found fallback |

---

## 6. Authentication & Roles

### Session Variables

When logged in, `$_SESSION` contains:
```
user_id     → members.id
username    → members.username
role        → members.role (admin | moderator | usher | user)
first_name  → members.first_name
last_name   → members.last_name
email       → members.email
login_time  → Unix timestamp
```

### Roles & Access

| Role | Access Level |
|------|-------------|
| `admin` | Full access to all pages including user management |
| `moderator` | Admin pages except user management |
| `usher` | Attendance app only (SSO to main app not standard) |
| `user` | Authenticated but limited — redirect to `user-dashboard` |

`pending` members (status field, not role) are restricted to `user-dashboard` and `logout`.

### SSO with Attendance App

A separate PHP attendance tracking app shares the MySQL DB.
- Attendance app uses session name `ATTENDANCE_SESSION`
- Main app uses session name `PHPSESSID`
- `auth.php::isLoggedIn()` checks both sessions
- On login to main app, `syncToAttendanceApp()` sets the attendance session
- On logout, `clearAttendanceAppSession()` destroys the attendance session

---

## 7. Database — `hog_fellowship`

### Core Tables

| Table | Purpose |
|-------|---------|
| `members` | Central user + member table (dual-purpose: auth + CRM) |
| `events` | Church events (Sunday Service, Prayer Meeting, etc.) |
| `attendance_records` | Who attended which event |
| `ministries` | Ministry groups (Worship, Admin, etc.) |
| `member_ministries` | Many-to-many: members ↔ ministries |
| `member_status_history` | History of status changes per member |
| `sms_reminders` | Scheduled SMS reminders per event |
| `sms_logs` | Send history per member per reminder |
| `sms_batch_stats` | Daily aggregate stats for SMS sends |
| `app_logs` | Full audit log of all admin actions |

### SMS Batch Tables (from `add_custom_sms_batch_processing.sql`)

| Table | Purpose |
|-------|---------|
| `custom_sms_batches` | Top-level batch record (status, priority, source) |
| `custom_sms_batch_recipients` | Individual recipient rows (personalized_message, send_status) |

### Key `members` Columns

```
id, first_name, last_name, email, phone
username, password (bcrypt), role, status (active|inactive|pending)
age_group (Adult|Youth|Kids), type (Family Member|Growing Friend|New Friend)
invited_by (freetext referral name), profile_picture, cover_photo
sms_5day_reminder, sms_3day_reminder, sms_1day_reminder, sms_same_day_reminder (tinyint booleans)
show_email, show_phone, show_address (privacy flags)
last_login, status_changed_at
```

### Key `events` Columns

```
id, title, description, event_date, start_time, end_time
location, event_type (sunday_service|prayer_meeting|bible_study|special_event|grace_night|other)
status (scheduled|cancelled|completed), created_by (FK → members.id)
```

### DB Views

| View | Description |
|------|-------------|
| `recent_app_logs` | Last 100 audit log entries |
| `daily_activity_summary` | Daily action counts by page/type (30-day window) |
| `user_activity_summary` | Per-user action totals (30-day window) |

---

## 8. SMS System

### Architecture

```
Admin creates event
  ↓
createEventReminders(event_id)   [utils/sms.php]
  ↓ inserts 4 rows into sms_reminders (per event, Manila time)
  ↓
[Cron: send_reminders.php — every 10 min]
  ↓ reads sms_reminders WHERE scheduled_time <= NOW()
  ↓ inserts into custom_sms_batches + custom_sms_batch_recipients
  ↓
[Cron: process_custom_sms_batches.php — every 2 min]
  ↓ reads 10 recipients from custom_sms_batch_recipients
  ↓ calls sendSms() → SMS-it API → SIM card
  ↓ updates recipient status, logs to sms_logs
```

### 4-Step Reminder Sequence

| Step | Trigger | Manila Time |
|------|---------|-------------|
| `5day` | 5 days before event | 5:00 PM |
| `3day` | 3 days before event | 7:00 AM |
| `1day` | 1 day before event | 5:00 PM |
| `same_day` | Day of event | 7:00 AM |

Members can opt out per reminder type via `sms_5day_reminder`, etc. columns.

### Rate Limiting

- **Batch size:** 10 messages per cron run
- **Delay between messages:** 1 second
- **Cron cadence:** every 2 minutes (the real rate limiter)
- **Lock:** MySQL `GET_LOCK('sms_gateway_lock')` prevents concurrent runs

### SMS-it API

- Config in `config/sms.php`
- Sender number is a physical Philippine SIM
- `CHURCH_TIMEZONE` = `Asia/Manila`

### Custom SMS (Manual Blast)

- UI: `?page=send-sms`
- Admin selects recipients (all, by type, by ministry, manual list)
- Writes personalized messages with `{name}` placeholder
- Inserts into `custom_sms_batches` + `custom_sms_batch_recipients`
- Processed by the same batch cron

---

## 9. AJAX Endpoints

### `ajax/user_actions.php`

Called with `POST action=...` from the members/users admin pages.

| Action | Description |
|--------|-------------|
| `update_member` | Edit member fields |
| `update_status` | Change member status (active/inactive/pending) |
| `delete_member` | Soft or hard delete |
| `update_profile` | Own profile photo/password update |
| `get_member` | Returns member JSON for edit modal |
| `toggle_privacy` | Toggle show_email, show_phone, show_address |

### `ajax/sms_actions.php`

| Action | Description |
|--------|-------------|
| `get_batch_status` | Returns pending/sent/failed counts |
| `retry_failed` | Requeues failed batch recipients |
| `cancel_batch` | Cancels a pending batch |
| `get_sms_logs` | Returns paginated SMS send log |

### `views/pages/events.php` (AJAX-enabled)

The events page itself handles POST via AJAX when `X-Requested-With: XMLHttpRequest` is set.
Returns `{ success: bool, message: string }` JSON.

| POST field | Action |
|-----------|--------|
| `add_event=1` | Create new event + optional SMS reminders |
| `update_event=1` | Update event + optional recreate reminders |
| `delete_event=1` | Delete event |

---

## 10. Helper Functions (`utils/functions.php`)

| Function | Description |
|----------|-------------|
| `writeToLog($message, $type)` | Writes to `logs/{type}_YYYY-MM-DD.log` |
| `sanitizeInput($input)` | Strips tags, trims |
| `sanitizeOutput($output)` | htmlspecialchars for display |
| `formatDate($date)` | Returns `"February 22, 2026"` format |
| `formatPhoneNumber($phone)` | Normalizes to +63XXXXXXXXXX (PH format) |
| `hasRole($roles)` | Checks session role against array |
| `getBaseUrl()` | Returns `/app.houseofgrace.ph` (local) or `` (live) |

---

## 11. Navigation & Routing Logic

`index.php` is the only entry point. It:
1. Starts `ob_start()` (output buffering)
2. Initializes session, config, DB, auth, functions
3. Checks login state and role restrictions
4. Includes `views/includes/header.php` (sends `<html><head>...`)
5. Includes `views/includes/navigation.php` (top navbar)
6. Includes `views/pages/{$page}.php`
7. Calls `ob_end_flush()`
8. Includes `views/includes/footer.php`

**Consequence for React:** The backend must become a pure API layer (no HTML output from PHP). React handles all routing client-side.

---

## 12. Cron Jobs (Live Server)

All cron scripts must run as CLI (`php_sapi_name() === 'cli'`).

```cron
# Send reminders to batch queue (every 10 min)
*/10 * * * * php /path/to/cron/send_reminders.php

# Process batches — sends 10 SMS per run (every 2 min)
*/2 * * * * php /path/to/cron/process_custom_sms_batches.php

# Clean old log files (daily)
0 2 * * * php /path/to/cron/clean_logs.php
```

**Timezone note:** Cron runs on UTC (London server). PHP scripts call `date_default_timezone_set('Asia/Manila')` first. MySQL sessions set `SET time_zone = '+08:00'`. All times in DB are Manila time.

---

## 13. Known Issues & Architecture Notes for Next.js Rewrite

| Issue | Detail |
|-------|--------|
| **No REST API** | All data returned as HTML. Extract PHP logic into Next.js Route Handlers (`app/api/*/route.ts`) |
| **Members = Users** | The `members` table is both the CRM AND the auth table. Consider splitting in rewrite, or use Prisma relations |
| **No token auth** | Sessions only. Use **NextAuth.js** with database sessions (MySQL adapter) |
| **Phone format** | Always normalize to `+63XXXXXXXXXX` — replicate `formatPhoneNumber()` in a shared util |
| **SSO with Attendance App** | The attendance app reads/writes same MySQL DB. Publish a shared NextAuth session cookie or use a shared JWT secret |
| **Avatar paths** | Stored as relative paths (`uploads/profile_pictures/xxx.jpg`). Migrate to S3 and return full CDN URLs |
| **SMS is SIM-based** | SMS-it API sends via a physical SIM. Keep the PHP cron scripts running or port to a Node.js cron service. Do NOT move to a purely browser-side solution |
| **File uploads** | Profile pictures and Sunday Word PDFs are in `uploads/`. Use Next.js API route + S3 pre-signed URLs |
| **Timezone** | Server is UTC. Always use `Asia/Manila` (UTC+8). In Next.js use `date-fns-tz` or Day.js with timezone plugin |
| **Output buffering** | Not relevant in Next.js — no PHP output buffering concerns |
| **Server Components** | Use Next.js Server Components to fetch DB data directly (Prisma) for admin pages. Client Components only for interactive UI |

---

## 14. Church Event Types

```
sunday_service   → Sunday Service
prayer_meeting   → Prayer Meeting
bible_study      → Bible Study
special_event    → Special Event
grace_night      → Grace Night
other            → Other
```

---

## 15. Member Types & Age Groups

**Type** (relationship to church):
- `Family Member` — core congregation
- `Growing Friend` — regular attendee, not yet committed
- `New Friend` — first-time or occasional visitor

**Age Group:**
- `Adult`
- `Youth`
- `Kids`

---

## 16. Versioning

This project follows **Semantic Versioning** (`MAJOR.MINOR.PATCH`).
See `CHANGELOG.md` for the full history.

| Current version | `v1.0.3` |
|-----------------|----------|
| Release date | 2026-02-22 |

---

## 17. Quick Reference for Next.js Agent

To understand any page, do this:
1. Find the page file: `views/pages/{page-name}.php`
2. Look at the SQL queries in that file — they define the data model for that view
3. Look at which AJAX calls the page makes → `ajax/user_actions.php` or `ajax/sms_actions.php`
4. Check `config/sms.php` for any SMS template logic
5. Check `utils/sms.php` for `createEventReminders()` and `sendSms()`
6. Reference `database/schema.sql` for table columns and relationships

**PHP → Next.js mapping:**
- Each `views/pages/*.php` = one Next.js `app/{route}/page.tsx` file
- Each AJAX `action=...` = one `app/api/{resource}/route.ts` Route Handler
- Each `$_SESSION['user_id']` check = NextAuth `auth()` middleware / `session.user.id`
- Each `hasRole(['admin', 'moderator'])` = Next.js middleware or `<ProtectedRoute roles={['admin','moderator']}>`
- Each SQL query in PHP = Prisma `db.tableName.findMany({ where: {...}, orderBy: {...} })`
- Each `include 'views/partials/...'` = React component imported into the page

---

## 18. Related Detail Documents

These files exist in the project root alongside this SYSTEM.md:

| File | Contents |
|------|----------|
| [ATTENDANCE_APP.md](./ATTENDANCE_APP.md) | Full documentation for the attendance kiosk app — all 4 widgets, 14 AJAX endpoints, auth, offline/PWA, DB ops, and Next.js rewrite notes |
| [MARKETPLACE.md](./MARKETPLACE.md) | Feature spec and Next.js implementation plan for the Marketplace — DB schema (4 new tables), API routes, UI notes, upload strategy, and 4-phase rollout plan |
| [AGENT_PROMPT.md](./AGENT_PROMPT.md) | Copy-paste onboarding prompt for any new AI agent starting the React/Next.js rewrite |
| [CHANGELOG.md](./CHANGELOG.md) | Version history (semver) of the HGF Connect main app |

**Recommended Next.js App Router folder structure:**
```
app/
├── (public)/
│   ├── page.tsx                → ?page=home
│   ├── login/page.tsx          → ?page=login
│   ├── register/page.tsx       → ?page=register
│   ├── directory/page.tsx      → ?page=member-directory
│   ├── events/page.tsx         → ?page=member-events
│   ├── event/[id]/page.tsx     → ?page=event-details
│   ├── member/[id]/page.tsx    → ?page=member-profile
│   └── resources/page.tsx      → ?page=resources
├── (admin)/
│   ├── admin/dashboard/page.tsx
│   ├── admin/members/page.tsx
│   ├── admin/events/page.tsx
│   ├── admin/send-sms/page.tsx
│   ├── admin/sms/page.tsx
│   ├── admin/ministries/page.tsx
│   ├── admin/users/page.tsx
│   └── admin/review/page.tsx
├── profile/page.tsx
├── marketplace/page.tsx
├── dashboard/page.tsx           → ?page=user-dashboard (pending users)
└── api/
    ├── auth/[...nextauth]/route.ts
    ├── members/route.ts          → ajax/user_actions.php actions
    ├── events/route.ts           → events.php POST handler
    └── sms/route.ts              → ajax/sms_actions.php actions
```
