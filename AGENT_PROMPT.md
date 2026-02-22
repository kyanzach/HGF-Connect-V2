# HGF Connect — Agent Onboarding Prompt

Copy and paste this prompt to any new AI agent (IDE or chat) to fully orient it to the HGF Connect codebase and prepare it to rewrite in **Next.js**.

> [!IMPORTANT]
> Every agent must also read **`CONTRIBUTING.md`** at the start of every working session (not just onboarding). It contains standing workflow rules: versioning, changelog, git, and self-deploy protocol — all of which must be followed without asking the user.

---

## Prompt

```
You are about to work on HGF Connect, a church management web application for House of Grace Fellowship (Davao City, Philippines).

## MANDATORY — Read CONTRIBUTING.md first (every session):
/Applications/XAMPP/xamppfiles/htdocs/app.houseofgrace.ph/CONTRIBUTING.md

This file contains your standing operating procedures:
- Versioning rules (v2.x.x semver, start at v2.0.0)
- Changelog protocol (update CHANGELOG.md on every change)
- Git workflow (always push — device is authenticated as kyanzach)
- Self-deploy rules (deploy without asking — check credentials.md for server details)
- credentials.md template (server IP, SSH, PM2 process name)


## Step 1 — READ THESE FILES FIRST (in this order):

1. /Applications/XAMPP/xamppfiles/htdocs/app.houseofgrace.ph/SYSTEM.md
   → Canonical knowledge base: every page, full tech stack (PHP current + Next.js 14 target),
     database schema, auth system, roles, SMS pipeline, cron jobs, folder layout, migration notes.

2. /Applications/XAMPP/xamppfiles/htdocs/app.houseofgrace.ph/ATTENDANCE_APP.md
   → Full documentation of the separate attendance kiosk app (shared MySQL DB).
     Every widget, AJAX endpoint, auth/SSO details, offline/PWA, and Next.js rewrite mapping.

3. /Applications/XAMPP/xamppfiles/htdocs/app.houseofgrace.ph/MARKETPLACE.md
   → Feature spec and implementation plan for the planned Marketplace feature.
     DB schema (4 new tables), Next.js API routes, UI notes, 4-phase rollout plan.

4. database/schema.sql
   → All tables, indexes, views, and foreign keys.

5. includes/auth.php
   → isLoggedIn(), hasRole(), SSO functions between main app and attendance app.

6. For any PHP page you plan to rewrite:
   → Read the corresponding views/pages/{name}.php file before writing any Next.js code.

7. For SMS logic:
   → config/sms.php, utils/sms.php, cron/process_custom_sms_batches.php, cron/send_reminders.php

## Environment context:

- Local path:    /Applications/XAMPP/xamppfiles/htdocs/app.houseofgrace.ph/
- Local URL:     http://localhost/app.houseofgrace.ph/
- Live URL:      https://app.houseofgrace.ph/
- Attendance app local URL: http://localhost/app.houseofgrace.ph/attendance/
- Database name: hog_fellowship (MySQL, localhost, user: root, no password on XAMPP)
- PhpMyAdmin:    http://localhost/phpmyadmin  → select hog_fellowship
- PHP pages:     views/pages/*.php
- Single entry:  index.php (routes via ?page= GET param)
- Attendance:    attendance/index.php (separate widget-based kiosk app)

## Target: Rewrite HGF Connect in Next.js 14 (App Router)

### Deployment target: DigitalOcean Droplet
- Ubuntu 22.04 LTS
- Node.js 20 LTS → runs `next start` on port 3000 (managed by PM2)
- Nginx → HTTPS reverse proxy (Let's Encrypt) to port 3000
- MySQL 8 / MariaDB → shared with attendance app (same server, same DB)
- PHP 8.x + Linux cron → SMS batch scripts STAY as PHP (do not rewrite)
- PM2 → keeps `next start` alive after reboots/crashes
- No Vercel. Everything is self-hosted on the same Droplet.

### Optional hybrid architecture:
- Pages that need SEO (Home, Events, Member Directory, Marketplace browse, Event detail) → Next.js SSR
- Pages that are auth-gated admin dashboards with no SEO value (custom SMS, charts, D3 trees) →
  can remain a Vite SPA if already built, to avoid unnecessary rewrites
- Attendance app → can be a Next.js route group (attendance)/ in the same app, removing SSO complexity

## Key facts to keep in mind:

- Database name: hog_fellowship
- members table is dual-purpose: both auth (username, password, role) AND CRM (phone, birthdate, ministry)
- Roles: admin > moderator > usher > user. status='pending' means not yet approved by admin
- SMS: SMS-it API through a Philippine SIM card — stays in PHP cron. Do NOT rewrite SMS sending in Node.js
- All times: Asia/Manila (UTC+8) regardless of server timezone. DB session forced to +08:00
- Attendance app: SEPARATE app under /attendance/ sharing the same hog_fellowship MySQL DB
- ATTENDANCE_SESSION: separate PHP session from the main app's PHPSESSID (SSO implemented in auth.php)
- Marketplace: NOT YET IMPLEMENTED. Currently a "Coming Soon" stub. Full plan is in MARKETPLACE.md
- Timezone constant: CHURCH_TIMEZONE defined in config/sms.php as 'Asia/Manila'
- Update CHANGELOG.md with every significant change (uses semver)

## Page → Next.js App Router route mapping:

?page=home            → app/page.tsx                    (public)
?page=login           → app/login/page.tsx              (public)
?page=register        → app/register/page.tsx           (public)
?page=member-directory→ app/directory/page.tsx          (public)
?page=member-events   → app/events/page.tsx             (public)
?page=member-profile  → app/member/[id]/page.tsx        (public)
?page=event-details   → app/event/[id]/page.tsx         (public)
?page=resources       → app/resources/page.tsx          (public)
?page=marketplace     → app/marketplace/page.tsx        (authenticated — see MARKETPLACE.md for full spec)
?page=dashboard       → app/(admin)/admin/page.tsx      (admin|moderator)
?page=members         → app/(admin)/admin/members/page.tsx    (admin|moderator)
?page=events          → app/(admin)/admin/events/page.tsx     (admin|moderator)
?page=send-sms        → app/(admin)/admin/send-sms/page.tsx   (admin|moderator)
?page=sms             → app/(admin)/admin/sms/page.tsx        (admin|moderator)
?page=ministries      → app/(admin)/admin/ministries/page.tsx (admin|moderator)
?page=users           → app/(admin)/admin/users/page.tsx      (admin only)
?page=review-actions  → app/(admin)/admin/review/page.tsx     (admin|moderator)
?page=profile         → app/profile/page.tsx            (any authenticated)
?page=user-dashboard  → app/dashboard/page.tsx          (pending users)

Attendance app routes (as a route group):
attendance/index.php        → app/(attendance)/attendance/page.tsx
attendance/login.php        → app/(attendance)/attendance/login/page.tsx

## AJAX endpoints → Next.js Route Handlers:

### Main app AJAX:
ajax/user_actions.php       → app/api/members/route.ts          (CRUD operations)
ajax/sms_actions.php        → app/api/sms/route.ts              (SMS batch status, retry, logs)
events.php POST handler     → app/api/events/route.ts           (add_event, update_event, delete_event)

### Attendance app AJAX (ajax/ endpoints under attendance/ajax/):
attendance/ajax/record_attendance.php       → app/api/attendance/record/route.ts
attendance/ajax/register_member.php         → app/api/members/route.ts  (POST, same as main)
attendance/ajax/update_member.php           → app/api/members/[id]/route.ts (PATCH)
attendance/ajax/search_members.php          → app/api/members/search/route.ts
attendance/ajax/get_attendance_report.php   → app/api/attendance/report/route.ts
attendance/ajax/export_attendance_report.php→ app/api/attendance/export/route.ts
attendance/ajax/get_birthdays.php           → app/api/members/birthdays/route.ts
attendance/ajax/get_current_event.php       → app/api/events/current/route.ts
attendance/ajax/get_quick_stats.php         → app/api/attendance/stats/route.ts
attendance/ajax/record_event_attendance.php → app/api/attendance/record-for-event/route.ts

### Marketplace AJAX (to be built — see MARKETPLACE.md):
(new) → app/api/marketplace/listings/route.ts
(new) → app/api/marketplace/listings/[id]/route.ts
(new) → app/api/marketplace/messages/route.ts

## Auth: use NextAuth.js v5
- Replace PHP sessions with NextAuth database sessions (MySQL adapter)
- $_SESSION['user_id']      → session.user.id        (from auth() in Server Components)
- $_SESSION['role']         → session.user.role
- hasRole(['admin'])        → check session.user.role in middleware or page component
- ATTENDANCE_SESSION SSO    → if attendance app is a route group in same Next.js app,
                              SSO is automatic — same NextAuth session

## ORM: use Prisma (MySQL adapter)
- Replace raw PDO SQL with Prisma queries
- Generate prisma/schema.prisma from database/schema.sql
- Add new marketplace tables (in MARKETPLACE.md § 4) to schema.prisma

## Styling: Tailwind CSS v3
- Replace Bootstrap 5 classes with Tailwind utilities
- Brand primary color: #4EB1CB (HGF teal) → add to tailwind.config.js as `primary`
- Dark primary: #3A95AD

## Before writing any component, always check:
1. What SQL query fetches the data for this page (read the PHP file first)
2. What POST/AJAX actions exist (they become Route Handler functions)
3. What role restrictions apply (hasRole() in PHP → middleware / layout guard in Next.js)
4. Whether the page has AJAX sub-requests (look for fetch/XMLHttpRequest in the PHP file's JS blocks)
5. Whether the page is attendance-app related (read ATTENDANCE_APP.md §§ relevant to that page)
6. Whether the task involves the marketplace (read MARKETPLACE.md fully before writing any marketplace code)
```
