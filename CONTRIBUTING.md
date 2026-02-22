# HGF Connect — Contributing & Workflow Guide

> **Read this at the start of every working session.**
> These are standing operating procedures for any agent (AI or human) working on this codebase.
> Following these rules is non-negotiable. Never ask the user to do any of these steps — do them yourself.

---

## 1. Versioning — Start at v2.0.0

**We start versioning at v2.0.0** because the Next.js + DigitalOcean rewrite is a completely different framework and infrastructure from the original PHP v1.x app. v1.x is the current PHP codebase. v2.x.x is the Next.js rewrite.

### Semver Rules

```
v{MAJOR}.{MINOR}.{PATCH}
```

| Type | When to use | Example triggers |
|------|------------|-----------------|
| **PATCH** `v2.0.1` | Bug fix, typo, style tweak, copy change, minor config fix | Fix broken query, fix layout bug, update env var |
| **MINOR** `v2.1.0` | New feature, new page, new API endpoint, new component, new DB table | Add marketplace listing page, add attendance report export |
| **MAJOR** `v3.0.0` | Breaking infra change, DB schema breaking change, complete page redesign, auth system change | Migrate from MySQL to Postgres, swap NextAuth for Clerk |

### Current version location
The current version is tracked in two places — keep both in sync:
1. `package.json` → `"version": "2.x.x"`
2. `CHANGELOG.md` → latest entry heading

---

## 2. Changelog — Update Every Change

**Always update `CHANGELOG.md`** before or alongside every commit. No exceptions.

### Format (keep Unreleased section at top)

```markdown
## [Unreleased]

## [v2.1.0] — 2026-02-22
### Added
- Marketplace browse page with filter sidebar
- `marketplace_listings` and `marketplace_listing_photos` database tables

### Changed
- Member directory now uses server-side pagination (was client-side)

### Fixed
- Attendance count not updating when member checked in via mobile

## [v2.0.0] — 2026-02-22
### Added
- Initial Next.js 14 App Router scaffold
- NextAuth.js v5 authentication with MySQL adapter
- Prisma ORM schema generated from legacy database/schema.sql
```

### Changelog categories
- `Added` — new feature, new page, new endpoint
- `Changed` — change to existing functionality
- `Fixed` — bug fix
- `Removed` — deleted feature or code
- `Security` — security-related fix
- `Deprecated` — something being phased out

---

## 3. Git Workflow — Always Push Without Asking

**The device is already authenticated to GitHub under the `kyanzach` account.** Do not ask the user to run git commands. Do not ask for confirmation before pushing. Just do it.

### Standard commit flow (run after every meaningful change)

```bash
# Stage all changes
git add -A

# Commit with a clear message
git commit -m "type(scope): short description

- detail 1
- detail 2"

# Push to main
git push origin main
```

### Commit message format

```
type(scope): short description
```

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation change |
| `style` | CSS / formatting, no logic change |
| `refactor` | Code restructure, no feature change |
| `chore` | Build config, dependency updates |
| `db` | Database schema change |
| `deploy` | Deployment config or infra change |

Examples:
```
feat(marketplace): add listing browse page with category filters
fix(attendance): correct first-visit detection query
docs(agent): update CONTRIBUTING.md with deploy steps
db(marketplace): add marketplace_listings and marketplace_messages tables
```

---

## 4. Deployment — Always Self-Deploy, Never Ask

**After every commit that changes application code (not just docs), deploy immediately without asking.**

### Credentials location

Before deploying, read the credentials file:

```
/Applications/XAMPP/xamppfiles/htdocs/app.houseofgrace.ph/credentials.md
```

This file contains:
- DigitalOcean Droplet IP address
- SSH username and key path (or password)
- PM2 process name
- Any environment variable locations on the server

> [!IMPORTANT]
> `credentials.md` is gitignored (never committed to GitHub). It lives only on the local machine.
> If the file does not exist yet, ask the user to create it using the template in Section 5 below.

### Deploy process (Next.js on DigitalOcean Droplet)

```bash
# 1. SSH into the Droplet (credentials in credentials.md)
ssh {user}@{droplet_ip}

# 2. Navigate to the app directory
cd /var/www/hgfconnect   # or wherever the app is deployed

# 3. Pull latest changes
git pull origin main

# 4. Install any new dependencies
npm install --frozen-lockfile

# 5. Build the Next.js app
npm run build

# 6. Restart the PM2 process (zero-downtime reload)
pm2 reload hgfconnect --update-env

# 7. Verify the app is running
pm2 status hgfconnect
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

If the curl returns `200`, deployment succeeded. Log result to the session.

### For PHP cron scripts (SMS — stays on Droplet, no rebuild needed)

```bash
# After editing cron/*.php files, just rsync or copy to server — no build step needed
scp cron/process_custom_sms_batches.php {user}@{droplet_ip}:/var/www/hgfconnect/cron/
```

### Deployment triggers

| Change type | Deploy? |
|------------|---------|
| Next.js page / component change | ✅ Yes — always |
| API Route Handler change | ✅ Yes — always |
| Prisma schema change (+ migration) | ✅ Yes — run `npx prisma migrate deploy` on server |
| PHP cron script change | ✅ Yes — copy file to server |
| Documentation only (`.md` files) | ❌ No — docs changes don't need a deploy |
| `CHANGELOG.md` / `SYSTEM.md` update | ❌ No |

---

## 5. `credentials.md` Template

If `credentials.md` does not exist yet, ask the user to create it at:

```
/Applications/XAMPP/xamppfiles/htdocs/app.houseofgrace.ph/credentials.md
```

With this template:

```markdown
# HGF Connect — Server Credentials

> WARNING: This file is gitignored. Never commit this file to GitHub.

## DigitalOcean Droplet

- IP Address: xxx.xxx.xxx.xxx
- SSH User: root  (or: ubuntu)
- SSH Key Path: ~/.ssh/id_rsa  (or paste password below)
- SSH Password: (if using password auth)
- App directory: /var/www/hgfconnect
- PM2 process name: hgfconnect
- Node.js version: 20.x
- Nginx config: /etc/nginx/sites-available/hgfconnect

## Environment Variables (on server)

- Location: /var/www/hgfconnect/.env.production
- DATABASE_URL: mysql://root:PASSWORD@localhost:3306/hog_fellowship
- NEXTAUTH_SECRET: (random 32-char string)
- NEXTAUTH_URL: https://app.houseofgrace.ph
- SMS_API_KEY: (from config/sms.php on legacy app)

## Database

- Host: localhost (MySQL on same Droplet)
- DB Name: hog_fellowship
- DB User: root (or dedicated db user)
- DB Password: (fill in)
- PhpMyAdmin: https://app.houseofgrace.ph/phpmyadmin (if enabled)

## GitHub

- Account: kyanzach
- Repo: kyanzach/HGFConnect
- Remote: https://github.com/kyanzach/HGFConnect.git
- Branch: main (always deploy from main)
```

---

## 6. Quick Reference Checklist

Run through this before ending any working session:

- [ ] `CHANGELOG.md` updated with what changed
- [ ] `package.json` version bumped (if applicable)
- [ ] `git add -A && git commit -m "..." && git push origin main` done
- [ ] If code changed: deployed to DigitalOcean Droplet
- [ ] Deployment verified: `pm2 status` shows online, HTTP 200 confirmed
- [ ] If DB schema changed: `prisma migrate deploy` run on server

---

## 7. Related Documentation Files

| File | Read when |
|------|-----------|
| `SYSTEM.md` | Understanding the full codebase, tech stack, and migration plan |
| `ATTENDANCE_APP.md` | Working on anything attendance-related |
| `MARKETPLACE.md` | Working on the marketplace feature |
| `AGENT_PROMPT.md` | Onboarding a brand new agent (copy-paste to orient them) |
| `credentials.md` | Deploying — contains server IP, SSH, PM2 process name |
| `database/schema.sql` | DB table reference |
| `CHANGELOG.md` | Version history — update before every commit |
