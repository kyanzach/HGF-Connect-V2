# HGF Connect — Full Reference

> This file contains all detailed patterns, examples, and specs for the HGF Connect project.
> The slim agent rule at `.agents/rules/connect-hgf.md` points here.

---

## 1. Project Overview

- **Stack**: Next.js 16 (App Router) + TypeScript + Prisma (MySQL) + PM2
- **Server**: DigitalOcean Droplet `159.65.15.225` — **low-RAM (≤1GB)**
- **Domain**: `https://connect.houseofgrace.ph`
- **PM2 process name**: `hgf-connect`
- **Brand color**: `#4EB1CB` (teal)
- **Style pattern**: Inline styles (no Tailwind), all client components are `"use client"`

---

## 2. Deployment (`deploy.sh`)

> ⚠️ Always use `./deploy.sh` from the project root. Never deploy manually.

### What it does:
1. Builds Next.js locally (nukes `.next` + `.prisma` cache first)
2. `rsync` uploads source files (excludes `node_modules`, `.next`, `.env`, `public/uploads`)
3. Packs `.next` → scp → extracts on server
4. Smart `npm install` (only if `package-lock.json` changed)
5. Always regenerates Prisma client on server
6. `pm2 restart hgf-connect`
7. Health check (HTTP 200)

### Rollback:
```bash
./deploy.sh --rollback
```

### Low-RAM server constraints:
- **NEVER** run Node.js scripts that use `mysql2` via SSH — they hang and crash
- **Always** use `mysql` CLI for DB changes:
  ```bash
  ssh root@159.65.15.225 'mysql -u hgfuser -p<pass> hgf_connect < /tmp/migration.sql'
  ```

---

## 3. Avoid Patterns (with examples)

### ❌ Never use native browser dialogs
```typescript
// BAD — disappears on mobile/PWA, can't be styled
if (!confirm("Delete?")) return;
alert("Error!");

// GOOD — use the shared ConfirmModal component
setConfirmModal({ title: "Delete Event", message: "...", onConfirm: () => ... });
```

**Rule**: Every destructive action (delete, reject, mark sold, send SMS) MUST use the `ConfirmModal` component from `@/components/ConfirmModal`.

### ❌ Never pass Prisma Date objects to client components
```typescript
// BAD — crashes: "Date objects are not supported"
return <ClientComponent events={events as any} />;

// GOOD — serialize first
const serialized = JSON.parse(JSON.stringify(events));
return <ClientComponent events={serialized} />;
```

**Why**: Prisma returns `Date` objects for `@db.Date`, `@db.Time`, `DateTime` fields. Next.js App Router cannot serialize `Date` across the server→client boundary.

### ❌ Never use `next/image` for `/uploads/` paths
```typescript
// BAD — Next.js image optimizer returns 400 for local upload paths
<Image src={`/uploads/marketplace/${photo}`} fill alt="" />

// GOOD — plain <img> with absolute positioning
<img src={`/uploads/marketplace/${photo}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
```

### ❌ Never use `git add -A` or `git add .`
Always stage specific files. See global rules for full git workflow.

---

## 4. UI Standards

### Design Language
- Primary: `#4EB1CB` (teal)
- Danger: `#ef4444` (red)
- Cards: white bg, `border: 1px solid #e2e8f0`, `borderRadius: 12px`
- Modals: `borderRadius: 16px`, `boxShadow: 0 20px 60px rgba(0,0,0,0.2)`, max-width 480-520px
- Buttons: `fontWeight: 700`, `borderRadius: 8px`, `padding: 0.625rem 1.25rem`
- Labels: `fontSize: 0.75rem`, `fontWeight: 700`, `color: #64748b`

### ConfirmModal Pattern
All destructive/important actions use the shared `<ConfirmModal>` with:
- Title (bold)
- Description message
- Cancel + Confirm buttons
- `confirmColor` prop (red for destructive, teal for safe)
- Loading state on confirm button while API call runs
- Backdrop click = cancel

### Safe-area padding
All sticky headers must include: `paddingTop: env(safe-area-inset-top)` for iPhone notch/island.

---

## 5. Prisma / Database Gotchas

### `@db.Time` fields
Prisma returns time-only columns as full ISO strings: `"1970-01-01T01:05:00.000Z"`. Use the `toHHMM()` helper to parse into `HH:MM` for forms, and `fmtTime()` for display.

### Enum changes
After adding/removing Prisma enum values:
1. Run `npx prisma generate` locally
2. Deploy via `deploy.sh` (it auto-runs `prisma generate` on server)
3. Never force-push schema without verifying migration

### Decimal fields
`Decimal` fields from Prisma come as strings in JSON. Parse with `parseFloat()` or `Number()` in client code.

---

## 6. Troubleshooting Flow

When a page crashes or shows errors:

1. **Check browser console** → look for serialization errors, hydration mismatches
2. **Check PM2 logs on server**:
   ```bash
   ssh root@159.65.15.225 'pm2 logs hgf-connect --lines 50'
   ```
3. **Check Prisma schema alignment** → is the field nullable? Does the type match the DB column?
4. **Check if it's a caching issue** → add `export const dynamic = "force-dynamic"` to API routes
5. **Check uploads** → `/uploads/` served by nginx, not Next.js. If images break, check nginx config
6. **Rollback if production is down**:
   ```bash
   ./deploy.sh --rollback
   ```

### Common errors
| Error | Cause | Fix |
|-------|-------|-----|
| `Application error: client-side exception` | Unserializable props (Date objects) | `JSON.parse(JSON.stringify(data))` before passing to client |
| `Column 'X' does not exist` | Prisma client out of sync with schema | `npx prisma generate` + redeploy |
| Stale/empty data on pages | Next.js aggressive GET caching | Add `export const dynamic = "force-dynamic"` |
| Broken images | `next/image` used for `/uploads/` | Replace with plain `<img>` |
| Native dialog disappears | `confirm()` / `alert()` in PWA | Use `ConfirmModal` component |

---

## 7. File Upload Rules

- All images go through `lib/processImage.ts` (Sharp → WebP conversion)
- Profile photos: 400×400, thumbnails: 80×80
- Cover photos: 1200×400
- Marketplace photos: processed through the same pipeline
- Upload paths: `/public/uploads/{profile_pictures,cover_photos,marketplace,events,prayer_audio}/`
- **`public/uploads/` is excluded from `rsync`** — never deploy local uploads to server

---

## 8. Service Worker & Versioning

- `public/service-worker.js` CACHE_NAME is auto-synced from `package.json` version via the `prebuild` script
- `lib/version.ts` is also auto-generated by prebuild
- `VersionGuard` component polls `/api/version` every 60s and shows an update modal on mismatch
- Never manually edit `service-worker.js` version or `lib/version.ts` — they are overwritten on every build

---

## Session Learnings Log

> Record all new learnings, plans, phases, and reasons here with dates.

### 2026-03-10
- **Events page crash fixed (v2.10.4)**: Prisma `Date` objects for `eventDate`, `startTime`, `endTime` were passed unserialized from server to client components. Fix: `JSON.parse(JSON.stringify(...))` before passing props. Applied to both `/admin/events` and `/events`.
- **ConfirmModal introduced (v2.10.5)**: Native `confirm()` dialogs disappear instantly on mobile/PWA. Created `components/ConfirmModal.tsx` and replaced all 7 `confirm()` call sites across 6 files (admin events, members, review, SMS, my-listings, prospects).
