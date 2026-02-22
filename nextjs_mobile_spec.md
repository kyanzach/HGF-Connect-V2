# MaskPro GetSales — Mobile-First Next.js Migration Spec
## Complete Implementation Guide for IDE Agent

---

## 0. Context: What Exists Today

The current app is a **React + Vite SPA** deployed on a DigitalOcean droplet at `getsales.maskpro.ph`. The backend is a separate **Node.js + Express API** on port 3002, also on the same droplet. A small **Next.js 14 public-web** app already exists at `/public-web/` serving the `/join/[ref]` SSR page on port 3005.

**Goal:** Rebuild the entire **agent-facing SPA** (the mobile app portion) in **Next.js 14 App Router**, keeping the Express API intact and unchanged. The admin panel stays in the existing Vite/React setup for now. The mobile app is what agents use daily — it must feel like a native mobile app.

---

## 1. Design Philosophy — GCash Mobile DNA

The app should feel like **GCash** — one of the most polished mobile fintech apps in the Philippines. Key design principles:

### 1.1 Color System
```css
/* Primary — MaskPro Blue (matches current brand) */
--brand-50:  #eff6ff;
--brand-100: #dbeafe;
--brand-200: #bfdbfe;
--brand-300: #93c5fd;
--brand-400: #60a5fa;
--brand-500: #3b82f6;
--brand-600: #2563eb;   /* PRIMARY ACTION — headers, buttons, active nav */
--brand-700: #1d4ed8;
--brand-800: #1e40af;
--brand-900: #1e3a8a;

/* Semantic */
--success:   #059669;  /* emerald-600 */
--warning:   #d97706;  /* amber-600 */
--danger:    #dc2626;  /* red-600 */
--surface:   #f8fafc;  /* page background — off-white, not pure white */
--card:      #ffffff;
--border:    #f1f5f9;  /* very light border */

/* Text */
--text-primary:   #0f172a;
--text-secondary: #64748b;
--text-muted:     #94a3b8;
```

### 1.2 Typography
- Font: **Inter** from Google Fonts (`next/font/google`)
- Page titles: `text-lg font-bold` (18px, 700)
- Section headers: `text-[15px] font-bold` (15px, 700)
- Body: `text-sm` (14px, 400–500)
- Labels/meta: `text-xs` (12px, 400–500)
- Nano labels (dock): `text-[10px]` (10px, 500)

### 1.3 Spacing & Shape
- Card radius: `rounded-2xl` (16px) or `rounded-3xl` (24px) for hero cards
- Button radius: `rounded-xl` (12px) for secondary, `rounded-2xl` (16px) for primary CTAs
- Page padding: `px-4` (horizontal), `pt-4` (from header)
- Card gap: `gap-3` between list items, `gap-4` between sections
- Hero card padding: `p-6`
- Standard card padding: `p-4`

### 1.4 GCash Pattern Rules
1. **Hero Card at top** — always the most important number (balance, earnings). Blue gradient, white text, 2 action buttons below it.
2. **Icon grid shortcuts (4 in a row)** — below hero. White pill icons on white cards, colored icon, label below. Tap to navigate. Like GCash's Send/Pay/Receive/More row.
3. **Horizontal scroll cards** — statistics overview, snap-to-card, no visible scrollbar. Each card 140px min-width.
4. **Section header rows** — `"Overview"` left, `"See All →"` right. Uppercase-ish, bold, small.
5. **Transaction/prospect list** — avatar initial circle left, name + details center, badge + date right. Dividers between.
6. **No floating action buttons sticking out of the page content** — the dock/FAB handles primary actions.
7. **Page transitions** — slides in from right (like native). Fade on tab switch.

---

## 2. App Structure (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/page.jsx           — OTP phone login
│   ├── register/page.jsx        — Sign up with ref code
│   ├── join/[ref]/page.jsx      — Public join page (SSR, OG tags) ← ALREADY EXISTS
│   └── welcome/page.jsx         — Post-registration welcome
│
├── (agent)/                     — Protected agent routes (middleware)
│   ├── layout.jsx               — MainLayout (header + bottom dock)
│   ├── dashboard/page.jsx       — Home
│   ├── prospects/
│   │   ├── page.jsx             — Prospects list
│   │   └── new/page.jsx         — Add prospect form
│   ├── commissions/page.jsx     — Commission history
│   ├── invite/page.jsx          — Invite tracking
│   ├── network/page.jsx         — Network tree (D3)
│   ├── knowledgebase/page.jsx   — MaskPro knowledge
│   ├── ai/page.jsx              — GetSales AI chat
│   ├── marketing-kit/page.jsx   — Marketing assets
│   └── profile/page.jsx         — Profile + settings
│
├── (admin)/                     — Admin only (separate layout)
│   ├── layout.jsx               — AdminLayout (sidebar desktop)
│   ├── page.jsx                 — Admin dashboard
│   ├── agents/
│   │   ├── page.jsx             — Agent list
│   │   └── [id]/page.jsx        — Agent profile
│   ├── commissions/page.jsx
│   ├── change-log/page.jsx
│   ├── push-broadcast/page.jsx
│   └── services/page.jsx
│
├── api/                         — Next.js API routes (optional thin proxies)
│   └── health/route.js
│
├── layout.jsx                   — Root layout (fonts, providers)
├── not-found.jsx                — 404 page
└── middleware.js                — Auth guard (JWT cookie check → redirect)
```

---

## 3. The Layout: MainLayout (Agent Shell)

This is the core shell. It wraps all agent pages.

### 3.1 Structure
```
┌─────────────────────────────────────────┐
│  HEADER (sticky, z-30)                  │  56px
│  [MaskPro icon] [Greeting + Name]  [🔔] │
├─────────────────────────────────────────┤
│  IMPERSONATION BAR (if impersonating)   │  36px conditional
├─────────────────────────────────────────┤
│                                          │
│  PAGE CONTENT                            │  flex-1, overflow-y-scroll
│  max-w-lg mx-auto px-4 pt-4 pb-28       │
│                                          │
│                                          │
├─────────────────────────────────────────┤
│  BOTTOM DOCK (fixed, z-40)              │  64px + safe area
│  [Home] [Inviters] [+Prospect] [Earn] [Profile] │
└─────────────────────────────────────────┘
```

### 3.2 Header Spec
```jsx
// Header: sticky, brand-600 bg, full width
<header className="sticky top-0 z-30 bg-brand-600 text-white px-4 h-14 flex items-center justify-between">
  {/* Left: logo + greeting */}
  <div className="flex items-center gap-3">
    <button onClick={() => router.push('/dashboard')}
      className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
      <Image src="/assets/maskpro-icon.png" width={28} height={28} alt="MaskPro" />
    </button>
    <div className="flex flex-col">
      <span className="text-[10px] text-brand-200 font-medium">{emoji} {greeting},</span>
      <span className="text-sm font-bold leading-tight">{firstName}</span>
    </div>
  </div>
  {/* Right: network status + version + notification bell */}
  <div className="flex items-center gap-2">
    <NetworkStatusDot />   {/* green/red dot */}
    <span className="text-[10px] text-brand-200 opacity-60">v{version}</span>
    <NotificationBell />
  </div>
</header>
```

### 3.3 Bottom Dock Spec
Five items. Middle item is a raised FAB (floating action button):
```
[Home]  [Inviters]  [🚗 +Prospect]  [Earn]  [Profile]
  ↑          ↑          ↑ -top-5        ↑          ↑
 icon       icon      Circle FAB      icon       icon
 label       label    brand-600 bg    label      label
 10px       10px      56px circle      10px       10px
```

```jsx
<nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100
                shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe-area">
  <div className="max-w-lg mx-auto h-16 flex items-center justify-around px-2">

    <NavItem href="/dashboard" icon={HomeIcon} label="Home" />
    <NavItem href="/network"   icon={ShareIcon} label="Inviters" />

    {/* Central FAB — raised above dock */}
    <div className="relative -top-5 w-16 flex flex-col items-center">
      <Link href="/prospects/new"
        className="w-14 h-14 bg-brand-600 rounded-full flex items-center justify-center
                   shadow-lg shadow-brand-600/40 ring-4 ring-white active:scale-95 transition-transform">
        <CarIcon className="w-7 h-7 text-white" />
      </Link>
      <span className="absolute -bottom-4 text-[10px] font-medium text-gray-500">+ Prospect</span>
    </div>

    <NavItem href="/commissions" icon={DollarIcon} label="Earn" />
    <NavItem href="/profile"     icon={UserIcon}   label="Profile" />
  </div>
</nav>
```

**NavItem component:**
- Inactive: `text-gray-400`
- Active: `text-brand-600`
- Transition: `transition-colors`
- Icon: 24px, stroke-2
- Label: `text-[10px] font-medium leading-none`

### 3.4 Impersonation Bar
When an admin is impersonating an agent, a sticky amber bar appears just below the header:
```jsx
// Only renders when isImpersonating === true
<div className="sticky top-14 z-20 bg-amber-50 border-b border-amber-200 px-4 py-2.5
                flex items-center justify-between">
  <div className="flex items-center gap-2">
    <span className="text-amber-600 text-xs font-semibold">
      👁 Viewing as {agent.full_name}
    </span>
  </div>
  <button onClick={stopImpersonating}
    className="text-xs text-amber-700 font-bold underline">
    Exit
  </button>
</div>
```

---

## 4. Page-by-Page Specs

### 4.1 Dashboard (`/dashboard`)

The home page. GCash-style layout: hero card → icon grid → horizontal scroll stats → recent list.

```
┌─────────────────────────────────────────┐
│  ╔═══════════════════════════════════╗  │
│  ║  Available Commissions            ║  │  Hero Card
│  ║  ₱ 0.00                          ║  │  bg-brand-600, rounded-3xl
│  ║  [Withdraw]   [View History]      ║  │  shadow-lg shadow-brand-600/30
│  ╚═══════════════════════════════════╝  │
│                                          │
│  [👥 Prospects] [➕ Invite] [📖 KB] [🤖 AI]   │  4-col icon grid
│                                          │
│  Overview ________________________ →     │
│  [Total]  [Converted] [Pending]  scroll  │  Horizontal snap cards
│                                          │
│  Recent Prospects _____________ See All  │
│  ┌──────────────────────────────────┐   │
│  │ [A] Alice Reyes  Ceramic  [New] │   │  List items
│  │ [B] Bob Santos   PPF    [Sent]  │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Hero Card (exact):**
- `bg-brand-600 rounded-[24px] p-6 text-white shadow-lg shadow-brand-600/30 mb-6 relative overflow-hidden`
- Decorative blobs: `absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10`
- Label: `text-brand-100 text-sm font-medium tracking-wide mb-1` → "Available Commissions"
- Amount: `text-3xl font-bold tracking-tight` → `₱ {amount}`
- Two buttons row: `flex gap-3 mt-6`
  - Withdraw: `flex-1 bg-white text-brand-600 font-bold py-2.5 rounded-xl text-sm`
  - View History: `flex-1 bg-brand-500/50 text-white font-bold py-2.5 rounded-xl text-sm backdrop-blur-sm`

**Icon Grid (4 cols):**
```jsx
const shortcuts = [
  { icon: UsersIcon,   label: 'My Prospects', color: 'text-blue-500',   href: '/prospects' },
  { icon: PlusIcon,    label: 'Add Inviter',  color: 'text-emerald-500', href: '/invite' },
  { icon: BookIcon,    label: 'Knowledgebase',color: 'text-amber-500',   href: '/knowledgebase' },
  { icon: SparkleIcon, label: 'GetSales AI',  color: 'text-purple-500',  href: '/ai' },
];
// Container: grid grid-cols-4 gap-4 mb-8
// Each item: flex-col items-center gap-2 active:scale-95 transition-transform
// Icon box: w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center
// Label: text-[11px] font-medium text-gray-700 text-center leading-tight
```

**Horizontal Scroll Section:**
```jsx
// Wrapper: flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x scroll-smooth
// Hide scrollbar: style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
// Each card: min-w-[140px] snap-start flex-shrink-0 bg-white rounded-2xl p-4 shadow-sm border border-gray-100
// Icon circle: w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-3
// Label: text-xs text-gray-500 font-medium mb-1
// Value: text-xl font-bold text-gray-900
```

**Recent Prospects List:**
```jsx
// Section: bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100
// Each row (inside divide-y divide-gray-100):
//   p-4 flex items-center gap-4 active:bg-gray-100 transition-colors
//   Avatar: w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center → initial letter, font-bold text-brand-600
//   Name: text-sm font-bold text-gray-900
//   Details: text-xs text-gray-500 → "vehicle make model • service"
//   Status badge: right side
//   Date: text-[10px] text-gray-400
```

---

### 4.2 Prospects (`/prospects`)

List page with search + filter.

**Header:**
- Sticky white subheader with search input: `bg-white px-4 py-3 border-b border-gray-100`
- `<input placeholder="Search by name or vehicle..." className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-sm" />`

**Filter tabs (horizontal scroll):**
```
[All] [New] [SMS Sent] [Follow Up] [Converted] [Lost]
```
- `flex gap-2 overflow-x-auto pb-1 px-4` with `scrollbar-none`
- Active tab: `bg-brand-600 text-white`
- Inactive: `bg-gray-100 text-gray-600`
- Each: `px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap`

**List:**
- Same pattern as Recent Prospects but full list
- Tap row → opens prospect detail sheet (slide-up modal or navigate to detail page)

---

### 4.3 Add Prospect (`/prospects/new`)

Full-page form. Back arrow header (← New Prospect 🎯).

```
[← New Prospect 🎯]         ← Sticky header, same brand-600 bg
────────────────────────────
Full Name *
[__________________________]

Relationship to you
[Friend ▼] (dropdown: Friend, Family, Colleague, Colleague, Custom)

Mobile Number *
[+63 ___________________]

Vehicle Make
[__________________________]

Vehicle Model
[__________________________]

Pre-select a service? [toggle OFF]
↓ when ON:
[Ceramic Coating ▼]

─────────── bottom ───────────
[     🎁 Send Gift Coupon     ]  ← Full-width brand-600 button
```

**Form inputs:**
- `bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm w-full`
- Label: `text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5`
- Focus: `border-brand-500 ring-2 ring-brand-100`

---

### 4.4 Commissions (`/commissions`)

**Top summary card (same hero pattern):**
- Total Earned, Total Paid, Unpaid balance
- Gradient: `from-emerald-500 to-teal-600`

**Horizontal scroll tier breakdown:**
- Tier 1 (Direct): `text-brand-600`
- Tier 2: `text-purple-500`
- Tier 3: `text-amber-500`

**Transaction list:**
- Same list pattern
- Each row: customer name, service, date left | tier badge + ₱ amount right
- Tier badge: `bg-brand-50 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full`

---

### 4.5 Invite Agent (`/invite`)

Form + invite list.

**Send invite form (card):**
```
bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6
→ Name input
→ Mobile input (with +63 prefix display)
→ Default message preview (gray bg, italic, expandable)
→ [Customize message] toggle
→ [📨 Send Invite via SMS] button
```

**Sent Invites list:**
- Each card: `bg-white border border-gray-100 rounded-xl shadow-sm`
- Status badge: Pending (amber) / Joined (emerald)
- Actions: [Follow Up] button + [⋯] kebab menu (opens UPWARD, z-50)
  - Edit → inline form in card
  - Delete → red confirmation banner (rounded-b-xl)
- ⚠️ CRITICAL: Do NOT add `overflow-hidden` to these cards — it clips the dropdown

---

### 4.6 Network Tree (`/network`)

D3.js force-directed or radial tree. **SSR-incompatible** — must use:
```jsx
const NetworkTree = dynamic(() => import('@/components/NetworkTree'), { ssr: false });
```

**Page structure:**
```
Header: [← Network Tree] [+ Add Inviter button]
Full-bleed canvas: height calc(100vh - 56px - 64px) (header + dock)
Floating controls: zoom +/- bottom right corner
Selected node panel: slide-up half sheet from bottom
```

**Root node rendering rule:** Use `d.depth === 0` NOT `d.data.is_root` to identify root. This works for all roles including impersonation.

---

### 4.7 Knowledgebase (`/knowledgebase`)

**Sticky search bar** at top.

**Category filter tabs (horizontal scroll):**
```
[All] [Nano Ceramic] [Window Tint] [PPF] [Auto Paint] [Go & Clean] [FAQ]
```

Each article: expandable card with chevron. Collapsed shows title only. Expanded shows full body text.

---

### 4.8 GetSales AI (`/ai`)

Chat interface.

**Layout:**
```
┌──────────────────┐
│ GetSales AI 🤖   │  ← sticky header
├──────────────────┤
│                  │
│  [suggestion]    │  ← horizontal marquee chips (right-to-left scroll)
│  [suggestion]    │
│                  │
│  💬 bubble left  │  ← AI messages
│         bubble ▶ │  ← User messages
│                  │
│                  │
├──────────────────┤
│ [Type...] [Send] │  ← sticky input bar (above dock)
└──────────────────┘
```

**Marquee suggestion chips** (CSS animation, right-to-left):
```css
@keyframes marquee-rtl {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```
Chips: `bg-brand-50 border border-brand-100 text-brand-700 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap`

**Message bubbles:**
- AI: `bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-3 max-w-[85%] text-sm text-gray-800 shadow-sm`
- User: `bg-brand-600 text-white rounded-2xl rounded-tr-sm p-3 max-w-[85%] text-sm ml-auto`

**Input bar (sticky above dock):**
```jsx
<div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-30">
  <div className="max-w-lg mx-auto flex gap-2">
    <input className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm" />
    <button className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
      <SendIcon className="w-5 h-5 text-white" />
    </button>
  </div>
</div>
```

---

### 4.9 Profile (`/profile`)

**Avatar section:**
```
bg-brand-600 rounded-b-3xl pb-6 pt-4 px-4 text-white text-center
→ large avatar circle (initials or photo)
→ name + role badge
→ referral code chip (tap to copy)
```

**Settings list:**
```
bg-white rounded-2xl divide-y divide-gray-50
→ [🔗] My Referral Link → copy button
→ [👤] Edit Profile
→ [🔒] Change Password
→ [📲] Biometric Login
→ [🔔] Notifications
→ [📴] Sign Out (red)
```
Each row: `p-4 flex items-center gap-3` → icon + label left, chevron right

---

### 4.10 Auth Pages

**Login (`/login`):**
```
Full screen, brand gradient bg
White card centered
→ MaskPro logo + "GetSales" subtitle
→ "Enter your mobile number"
→ [+63] [09XX XXX XXXX] phone input  ← actual Philippine format
→ [Send OTP] button (brand-600, full width, rounded-2xl)
→ Or: [Login with Biometrics] (if enrolled, auto-detect)
→ "Don't have an account? Join" link
```

**OTP Step (same page, step 2):**
```
6-digit OTP input (auto-split into 6 boxes like banking apps)
Auto-advance on each digit
[Verify] button
[Resend OTP → 30s countdown]
[← Back to phone number]
```

**Register (`/register?ref=CODE`):**
```
→ Full name
→ Mobile
→ Password (or OTP)
→ Referral code (pre-filled from URL, locked)
→ [Create Account]
```

---

## 5. Auth & Middleware

### 5.1 JWT Strategy
- Token stored in **httpOnly cookie** (set by Express API on login), NOT localStorage
- Next.js `middleware.js` reads cookie and redirects unauthenticated users
- Zustand store `authStore` syncs with the cookie on client-side for UI state

```js
// middleware.js
import { NextResponse } from 'next/server';

const PROTECTED = ['/dashboard', '/prospects', '/commissions', '/invite', '/network', '/ai', '/profile', '/knowledgebase'];
const ADMIN_ONLY = ['/admin'];

export function middleware(request) {
  const token = request.cookies.get('getsales_token')?.value;
  const { pathname } = request.nextUrl;

  const needsAuth = PROTECTED.some(p => pathname.startsWith(p));
  const needsAdmin = ADMIN_ONLY.some(p => pathname.startsWith(p));

  if ((needsAuth || needsAdmin) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/prospects/:path*', '/commissions/:path*', '/invite/:path*', '/network/:path*', '/ai/:path*', '/profile/:path*', '/knowledgebase/:path*', '/admin/:path*'] };
```

### 5.2 API Calls (Client Components)
All authenticated API calls go through an `apiClient` that reads the token from Zustand store:
```js
// lib/apiClient.js
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL; // https://getsales.maskpro.ph/api

export const apiClient = axios.create({ baseURL: API_BASE, withCredentials: true });
```

---

## 6. Critical Component Patterns

### 6.1 Horizontal Scroll (No Scrollbar Pattern)
```jsx
// Always use this exact pattern for horizontal scroll sections
<div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x scroll-smooth"
     style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
  {items.map(item => (
    <div key={item.id}
         className="min-w-[140px] snap-start flex-shrink-0 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      {/* content */}
    </div>
  ))}
</div>
```
The `-mx-4 px-4` trick extends the scroll area edge-to-edge while keeping content padded.

### 6.2 Section Header Row
```jsx
<div className="flex items-center justify-between mb-3 px-1">
  <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
  <Link href={seeAllHref} className="text-xs text-brand-600 font-semibold uppercase tracking-wider">
    See All
  </Link>
</div>
```

### 6.3 Status Badges
```jsx
const badgeMap = {
  new:         'bg-blue-50 text-blue-700 border border-blue-100',
  sms_sent:    'bg-sky-50 text-sky-700 border border-sky-100',
  follow_up_1: 'bg-amber-50 text-amber-700 border border-amber-100',
  follow_up_2: 'bg-orange-50 text-orange-700 border border-orange-100',
  converted:   'bg-emerald-50 text-emerald-700 border border-emerald-100',
  lost:        'bg-red-50 text-red-600 border border-red-100',
  pending:     'bg-amber-50 text-amber-700 border border-amber-100',
  joined:      'bg-emerald-50 text-emerald-700 border border-emerald-100',
};
// Usage: <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${badgeMap[status]}`}>{label}</span>
```

### 6.4 Skeleton Loading
Always use skeleton placeholders, never spinner-only loaders:
```jsx
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
      <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
      <div className="h-5 bg-gray-100 rounded w-1/2" />
    </div>
  );
}
```

### 6.5 Empty State
```jsx
function EmptyState({ icon, title, subtitle, cta }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-3xl">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-6">{subtitle}</p>
      {cta}
    </div>
  );
}
```

### 6.6 Pull-to-Refresh
Use `react-pull-to-refresh` or custom touch handler on list pages.

---

## 7. PWA Config (next-pwa)

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // config
});
```

**manifest.json:**
```json
{
  "name": "MASKPRO GetSales",
  "short_name": "GetSales",
  "theme_color": "#2563eb",
  "background_color": "#f8fafc",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/dashboard",
  "icons": [...]
}
```

---

## 8. Docker Setup

### 8.1 Project Structure After Migration
```
getsales.maskpro.ph/
├── client-next/          ← New Next.js app (replaces Vite SPA)
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── server/               ← Express API (UNCHANGED)
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── public-web/           ← Existing Next.js join/public pages (keep)
│   ├── app/join/[ref]/
│   └── Dockerfile
├── docker-compose.yml
└── nginx/
    ├── Dockerfile
    └── nginx.conf
```

### 8.2 Dockerfiles

**client-next/Dockerfile:**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**server/Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3002
CMD ["node", "src/server.js"]
```

**public-web/Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV PORT=3005
COPY --from=builder /app/.next .next
COPY --from=builder /app/node_modules node_modules
COPY package.json .
EXPOSE 3005
CMD ["npm", "start"]
```

### 8.3 docker-compose.yml
```yaml
version: '3.9'

services:
  nginx:
    build: ./nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - client-next
      - server
      - public-web
    restart: unless-stopped

  client-next:
    build: ./client-next
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://getsales.maskpro.ph/api
    restart: unless-stopped

  server:
    build: ./server
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_USER=${DB_USER}
      - DB_PASS=${DB_PASS}
      - DB_NAME=maskpro_commissions
      - JWT_SECRET=${JWT_SECRET}
      - ITEXMO_API_KEY=${ITEXMO_API_KEY}
      - SMSIT_API_KEY=${SMSIT_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - mysql
    restart: unless-stopped

  public-web:
    build: ./public-web
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: maskpro_commissions
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASS}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASS}
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

### 8.4 nginx/nginx.conf (inside Docker)
```nginx
upstream client_next  { server client-next:3000; }
upstream api_server   { server server:3002; }
upstream public_next  { server public-web:3005; }

server {
    listen 80;
    server_name getsales.maskpro.ph;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name getsales.maskpro.ph;

    ssl_certificate /etc/letsencrypt/live/getsales.maskpro.ph/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/getsales.maskpro.ph/privkey.pem;

    # Public pages (SSR — Next.js public-web)
    location /join {
        proxy_pass http://public_next;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Express API
    location /api/ {
        proxy_pass http://api_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Agent app (Next.js mobile app — everything else)
    location / {
        proxy_pass http://client_next;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Next.js HMR / websocket (dev only, remove in prod)
    location /_next/webpack-hmr {
        proxy_pass http://client_next;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

---

## 9. Environment Variables

### client-next/.env.local (development)
```
NEXT_PUBLIC_API_URL=http://localhost:3002/api
NEXT_PUBLIC_APP_VERSION=2.0.0
```

### client-next/.env.production
```
NEXT_PUBLIC_API_URL=https://getsales.maskpro.ph/api
NEXT_PUBLIC_APP_VERSION=2.0.0
```

### server/.env (unchanged — keep as is)
```
PORT=3002
DB_HOST=localhost
DB_USER=root
DB_PASS=...
DB_NAME=maskpro_commissions
JWT_SECRET=...
JWT_EXPIRY=7d
ITEXMO_API_KEY=...
ITEXMO_PASSWORD=...
SMSIT_API_KEY=...
OPENAI_API_KEY=...
APP_URL=https://getsales.maskpro.ph
FIREBASE_SERVER_KEY=...
```

---

## 10. Package Dependencies

### client-next/package.json key deps
```json
{
  "dependencies": {
    "next": "14.2.x",
    "react": "^18",
    "react-dom": "^18",
    "axios": "^1.6",
    "zustand": "^4",
    "d3": "^7",
    "react-icons": "^5",
    "next-pwa": "^5.6"
  },
  "devDependencies": {
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

### next.config.js
```js
const withPWA = require('next-pwa')({ dest: 'public', disable: process.env.NODE_ENV === 'development' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',    // Required for Docker multi-stage build
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'getsales.maskpro.ph' },
    ],
  },
};

module.exports = withPWA(nextConfig);
```

### tailwind.config.js
```js
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
          300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6',
          600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
        },
        surface: '#f8fafc',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
```

---

## 11. Express API Endpoints (Reference — DO NOT CHANGE)

All endpoints at `https://getsales.maskpro.ph/api` or `http://localhost:3002/api`:

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/request-otp` | Send OTP to phone |
| POST | `/auth/verify-otp` | Verify OTP, returns JWT |
| POST | `/auth/register` | New user registration |
| POST | `/auth/logout` | Clear session |
| GET | `/auth/me` | Get current user |
| GET | `/auth/verify-referral/:code` | Check referral code validity |

### Agents
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/agents/public/:ref` | No | Public agent info for OG tags |
| GET | `/agents` | ✓ | List agents |
| GET | `/agents/tree` | ✓ | Org tree data |
| GET | `/agents/:id/profile` | ✓ | Agent profile + KPIs |
| GET | `/agents/invitations` | ✓ | List sent invites |
| POST | `/agents/invite` | ✓ | Send invite SMS |
| POST | `/agents/invitations/:id/followup` | ✓ | Follow-up SMS |
| PATCH | `/agents/invitations/:id` | ✓ | Edit invite |
| DELETE | `/agents/invitations/:id` | ✓ | Delete invite |
| POST | `/agents/master` | Admin | Create master agent |

### Prospects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/prospects` | List prospects |
| GET | `/prospects/stats` | Dashboard KPIs |
| POST | `/prospects` | Create prospect |
| PUT | `/prospects/:id` | Update prospect |

### Commissions
| GET | `/commissions` | List commissions |
| POST | `/commissions/withdraw` | Request withdrawal |

### Push / Notifications
| POST | `/push/subscribe` | Save push subscription |
| GET | `/notifications` | List notifications |
| POST | `/notifications/:id/read` | Mark read |

### AI
| POST | `/ai/chat` | GetSales AI chat (OpenAI gpt-4o-mini) |

---

## 12. Mobile-Specific Patterns

### 12.1 Safe Area Insets (iPhone notch/home bar)
```css
/* globals.css */
.pb-safe-area {
  padding-bottom: env(safe-area-inset-bottom);
}
.pt-safe-area {
  padding-top: env(safe-area-inset-top);
}
```

### 12.2 Tap Highlights
```css
* { -webkit-tap-highlight-color: transparent; }
button, a { touch-action: manipulation; }
```

### 12.3 Prevent Body Scroll When Modals Open
```js
useEffect(() => {
  if (isOpen) document.body.style.overflow = 'hidden';
  else document.body.style.overflow = '';
  return () => document.body.style.overflow = '';
}, [isOpen]);
```

### 12.4 Slide-Up Modal Pattern (for detail sheets)
```jsx
// Instead of navigating to new page for prospect details
<div className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out
                  ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
  <div className="bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto">
    <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-5" /> {/* drag handle */}
    {/* content */}
  </div>
</div>
{isOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={close} />}
```

### 12.5 Back Navigation Header (sub-pages)
For pages that are not in the bottom dock (like Add Prospect, Knowledgebase article detail):
```jsx
<header className="sticky top-0 z-30 bg-brand-600 text-white px-4 h-14 flex items-center gap-3">
  <button onClick={() => router.back()}
    className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
    <ChevronLeftIcon className="w-5 h-5" />
  </button>
  <h1 className="text-sm font-bold">{title}</h1>
</header>
```

---

## 13. State Management (Zustand)

```js
// store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist(
  (set, get) => ({
    user: null,
    token: null,
    impersonating: false,
    impersonatedUser: null,
    initializing: true,

    setAuth: (user, token) => set({ user, token, initializing: false }),
    logout: () => {
      // Call API logout, clear cookie
      set({ user: null, token: null, impersonating: false });
    },
    loadUser: async () => {
      try {
        const { data } = await apiClient.get('/auth/me');
        set({ user: data, initializing: false });
      } catch {
        set({ user: null, token: null, initializing: false });
      }
    },
    startImpersonating: (agent) => set({ impersonating: true, impersonatedUser: agent }),
    stopImpersonating: () => set({ impersonating: false, impersonatedUser: null }),
  }),
  { name: 'getsales-auth', partialize: (s) => ({ token: s.token }) }
));
```

---

## 14. Deployment Flow

### Local Development
```bash
cd client-next && npm run dev   # port 3000
cd server && npm run dev        # port 3002 (unchanged)
```

### Production (Docker)
```bash
docker compose build
docker compose up -d
```

### Rollback
```bash
docker compose down
git checkout <previous-tag>
docker compose build && docker compose up -d
```

---

## 15. File Priority Order (What to Build First)

Build in this exact order to avoid blocked dependencies:

1. `tailwind.config.js` + `globals.css` — design tokens first
2. `app/layout.jsx` — root layout with Inter font, providers
3. `middleware.js` — auth guard
4. `lib/apiClient.js` + `store/authStore.js` — data layer
5. `components/ui/` — shared: badge, skeleton, empty state, slide-up modal
6. `app/(agent)/layout.jsx` — MainLayout (header + dock)
7. `app/(agent)/dashboard/page.jsx` — most complex page, proves the design system
8. `app/(auth)/login/page.jsx` — OTP login
9. Remaining agent pages in priority order: prospects → commissions → invite → profile
10. `app/(admin)/layout.jsx` + admin pages

---

## 16. THE PROMPT

> Use this verbatim when instructing another IDE agent:

---

```
You are building a mobile-first Next.js 14 App Router web application called "MaskPro GetSales" — 
a commission-tracking portal for MaskPro Auto Detailing Hub sales agents in the Philippines. 
This app replaces a Vite/React SPA.

DESIGN REFERENCE: Model the UI exactly after GCash mobile app patterns:
- Hero card at top (wallet-style, brand-blue gradient, total earnings, action buttons)
- 4-column icon shortcut grid below hero (like GCash's Send/Pay/Receive/More)
- Horizontal snap-scroll stats cards (no visible scrollbar)
- Section headers: title left, "See All" right
- Transaction/prospect list with avatar initials, details, status badge, date
- Fixed bottom dock with 5 items + raised center FAB

DESIGN TOKENS:
- Primary: #2563eb (brand-600), Surface: #f8fafc, Card: white, Border: #f1f5f9
- Fonts: Inter (Google Fonts via next/font/google)
- Radius: rounded-2xl cards, rounded-3xl hero, rounded-full FAB
- Everything max-w-lg mx-auto for phone-width centering

LAYOUT SHELL (MainLayout for agent pages):
- Sticky header (56px, brand-600 bg): [logo+greeting] | [notif bell]
- Optional impersonation bar (amber, 36px, below header, admin-only)
- Page content: flex-1 overflow-y-auto pb-28 px-4
- Fixed bottom dock (64px + safe-area): Home | Inviters | [+Prospect FAB] | Earn | Profile

ROUTES TO IMPLEMENT:
Agent (protected, use MainLayout):
  /dashboard, /prospects, /prospects/new, /commissions, /invite, /network, /knowledgebase, /ai, /profile

Auth (public):
  /login (OTP phone), /register, /join (SSR already exists), /welcome

Admin (protected admin role, use AdminLayout with sidebar):
  /admin, /admin/agents, /admin/agents/[id], /admin/commissions, /admin/change-log, /admin/push-broadcast, /admin/services

API: All data comes from Express API at process.env.NEXT_PUBLIC_API_URL (https://getsales.maskpro.ph/api)
Auth: JWT in httpOnly cookie. Use Next.js middleware.js to protect routes.
State: Zustand for auth store.

KEY PATTERNS:
- Horizontal scroll: flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x, scrollbarWidth:'none'
- NEVER add overflow-hidden to cards that contain dropdowns (clips the menu)
- All dropdowns open UPWARD (bottom-8) with z-50 to clear fixed dock
- D3 network tree: dynamic(() => import, { ssr: false }) — SSR will crash
- Status badges: pill style, color-coded (new=blue, converted=emerald, lost=red)
- Skeleton loaders on all async content (no bare spinners)
- Safe area: pb-safe-area on dock using env(safe-area-inset-bottom)

DOCKER: 
- client-next runs on port 3000 (output: standalone in next.config.js)
- Express API on port 3002 (unchanged, just containerize)
- public-web (existing join page) on port 3005
- Nginx reverse proxy: /join → 3005, /api → 3002, / → 3000
- docker-compose.yml with mysql service + volume

BUILD ORDER:
1. tailwind.config.js (add brand colors, surface color, Inter font var)
2. globals.css (reset, safe-area utils, hide-scrollbar, tap-highlight:none)
3. app/layout.jsx (root, Inter font, providers)
4. middleware.js (JWT cookie check, redirect to /login)
5. lib/apiClient.js (axios instance with withCredentials:true)
6. store/authStore.js (zustand + persist, loadUser, logout, impersonation)
7. components/ui/ (Badge, Skeleton, EmptyState, SlideUpModal, NavItem)
8. app/(agent)/layout.jsx (MainLayout: header + impersonation bar + dock)
9. app/(agent)/dashboard/page.jsx (full GCash-style: hero + grid + hscroll + list)
10. app/(auth)/login/page.jsx (OTP phone + 6-box OTP input)
11. All remaining pages in this order: prospects → commissions → invite → profile → knowledgebase → ai → network → admin pages

Do NOT use TypeScript. Use JavaScript with JSX.
Do NOT use app/page.jsx as the main dashboard — use route groups properly.
Install: next@14, react, react-dom, axios, zustand, d3, react-icons, next-pwa, tailwindcss
```

---

## 17. Express API: Mobile Number Validation

All invite/send SMS endpoints validate Philippine mobile numbers server-side:
```js
const digits = String(mobile).replace(/\D/g, '');
if (digits.length < 10 || digits.length > 11) {
  return res.status(400).json({ error: 'Invalid mobile number. Enter a valid Philippine number (e.g. 09171234567).' });
}
```
Frontend must mirror this validation before submitting.

---

## 18. Existing Assets (Copy From Vite Build)

These assets exist at `/client/public/assets/` and must be copied to `client-next/public/assets/`:
- `maskpro-icon.png` — app icon
- `join-og-friends.jpg` — OG image for join page
- Icons, splash screens for PWA

Firebase service worker config also needs to be ported.
