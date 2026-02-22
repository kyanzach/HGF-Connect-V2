# HGF Connect Marketplace — Feature Specification & Implementation Plan

> **Status:** Currently a "Coming Soon" stub page (`views/pages/marketplace.php`)
> **Priority:** Future feature — not yet implemented
> **This document:** Full feature spec, database design, API plan, and Next.js implementation roadmap

---

## 1. What the Marketplace Is (Vision)

The HGF Connect Marketplace is a **community commerce platform** exclusively for House of Grace Fellowship members. Think of it as a members-only Facebook Marketplace, but embedded inside the church portal — faith-driven, trusted, and community-oriented.

### Stated Goals (from `home.php`)
The home page explicitly promises three things:

1. **Member Marketplace** — "A dedicated platform where HGF members can showcase and sell their holistic products and services. From handmade crafts to wellness services, support fellow members while discovering amazing offerings."
2. **Holistic Marketplace** — "Discover and support member businesses offering holistic products and services." (listed in the feature grid alongside Profile Management and Events)
3. **Official HGF Store** — "Shop our exclusive collection of House of Grace Fellowship branded merchandise and spiritual resources. From inspirational books to branded apparel, everything you need to represent your faith community."

### Three Sub-Sections Planned
| Section | Description |
|---------|-------------|
| **Community Trading** | Member-to-member buy/sell/trade. Furniture, electronics, clothing, collectibles, etc. |
| **Support Local** | Member-owned businesses: catering, tutoring, accounting, home repair, home-based services |
| **Share Resources** | Free sharing — tools, books, household items, pets for adoption, lending library |

---

## 2. Current State (Stub Page)

**File:** `views/pages/marketplace.php`

The current page is a polished "Coming Soon" page with:
- Animated store icon (pulse animation)
- "Marketplace" heading with gradient text  
- "Coming Soon" badge
- 3 feature preview cards (Community Trading, Support Local, Share Resources)
- A rotating random Bible verse (8 hardcoded verses from Jeremiah 29:11, Proverbs 3:5-6, Romans 8:28, Isaiah 40:31, Joshua 1:9, Zephaniah 3:17, 1 Peter 5:7, Psalm 23:1-3)
- Sparkle mouse-move particle effect
- Scroll-based IntersectionObserver card animations
- CTA buttons: "Explore Community" → `/member-directory` and "Upcoming Events" → `/member-events`

The page has **no backend functionality yet**. No database tables, no CRUD, no listings.

---

## 3. Proposed Feature Set (Full Implementation)

### 3.1 Listing Types

| Category | Subcategories | Examples |
|----------|--------------|---------|
| **For Sale** | Electronics, Furniture, Clothing, Books, Appliances, Collectibles, Baby Items, Sports | Laptop, sofa, clothing lot, Bible, refrigerator |
| **Services** | Tutoring, Catering, Home Repair, Accounting, Haircut, Transportation, Sewing, Photography | Kids tutoring, birthday catering |
| **Free / Give Away** | Any item offered for free | Old books, clothes, toys |
| **Trade / Swap** | Items offered for trade | "Laptop → want iPad" |
| **Borrow / Lend** | Temporary lending | Power tools, folding tables |
| **Pets** | Adoption | Puppies, kittens |
| **HGF Official Store** | Books, Apparel, Accessories | Godly magazines, church shirts, bags |

### 3.2 Core Features

#### Member Listings
- Any active member can create a listing
- Listing has: title, description, price (or "Free" or "Negotiable"), photos (up to 5), category, condition (New/Like New/Good/Fair), location (general area, not exact address)
- Listing status: Active, Sold, Reserved, Expired, Removed
- Listings auto-expire after 60 days (configurable)
- Member can mark listing as Sold/Reserved

#### Browse & Search
- Public browse (all logged-in members can see)
- Filter by: category, listing type (sale/trade/free/service), price range, member type (Family Member only, all), date posted
- Search by keyword (title + description)
- Sort by: Newest, Price (low-high / high-low), Nearest expiry

#### Member-to-Member Messaging (Internal)
- Buyer clicks "I'm Interested" on a listing
- Opens an internal message thread between buyer and seller
- Messages stored in DB (no external messaging)
- Email/SMS notification to seller: "Someone is interested in your listing!"

#### Seller Profile
- Each member's profile page shows a "Listings" tab
- Shows their active and past listings
- Seller rating (optional, future) 

#### Official HGF Store (Separate Section)
- Managed by admins only
- Items: books, apparel, bags, accessories, faith-based items
- Orders recorded; payment handled offline or via GCash reference number
- Admin dashboard to manage store inventory

### 3.3 Safety & Trust Features

| Feature | Description |
|---------|-------------|
| **Members-only access** | Must be logged in and `status = 'active'` to view or post listings |
| **Real member profiles** | Listings show seller's real name, member type, and join date — builds trust |
| **Report listing** | Flag inappropriate content; admin can remove |
| **Admin moderation** | Admin can remove any listing, ban sellers |
| **No anonymous listing** | Every listing is tied to a member account (no guest listings) |

---

## 4. Database Schema

### New Tables Required

```sql
-- Marketplace listings
CREATE TABLE `marketplace_listings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `member_id` int(11) NOT NULL,                  -- FK → members.id (seller)
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `listing_type` enum('sale','trade','free','service','borrow','official_store') NOT NULL,
  `category` varchar(100) DEFAULT NULL,           -- Electronics, Clothing, Services, etc.
  `price` decimal(10,2) DEFAULT NULL,             -- NULL = free or negotiable
  `price_label` varchar(50) DEFAULT NULL,         -- "Free", "Negotiable", "P500", etc.
  `condition_type` enum('new','like_new','good','fair') DEFAULT NULL,  -- Not applicable for services
  `location_area` varchar(200) DEFAULT NULL,      -- General area (district/barangay)
  `status` enum('active','sold','reserved','expired','removed') NOT NULL DEFAULT 'active',
  `is_official_store` tinyint(1) DEFAULT 0,       -- 1 = HGF Official Store item
  `view_count` int(11) DEFAULT 0,
  `expires_at` date DEFAULT NULL,                 -- Auto-calculated: created_at + 60 days
  `sold_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_member_id` (`member_id`),
  KEY `idx_status` (`status`),
  KEY `idx_listing_type` (`listing_type`),
  KEY `idx_category` (`category`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_official_store` (`is_official_store`),
  FULLTEXT KEY `idx_fulltext_search` (`title`, `description`),
  CONSTRAINT `fk_marketplace_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Listing photos (up to 5 per listing)
CREATE TABLE `marketplace_listing_photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `photo_path` varchar(255) NOT NULL,             -- Relative path: uploads/marketplace/xxx.jpg
  `sort_order` tinyint(3) NOT NULL DEFAULT 0,     -- 0 = primary/cover photo
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_id` (`listing_id`),
  CONSTRAINT `fk_photo_listing` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages between buyer and seller per listing
CREATE TABLE `marketplace_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,                   -- FK → members.id
  `receiver_id` int(11) NOT NULL,                 -- FK → members.id
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_id` (`listing_id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_receiver_id` (`receiver_id`),
  KEY `idx_is_read` (`is_read`),
  CONSTRAINT `fk_message_listing` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_message_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reports for moderation
CREATE TABLE `marketplace_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `reported_by` int(11) NOT NULL,                 -- FK → members.id
  `reason` enum('inappropriate','spam','scam','wrong_category','other') NOT NULL,
  `details` text DEFAULT NULL,
  `status` enum('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(11) DEFAULT NULL,             -- FK → members.id (admin)
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_id` (`listing_id`),
  KEY `idx_reported_by` (`reported_by`),
  CONSTRAINT `fk_report_listing` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Existing Tables to Update
```sql
-- Upload folder for marketplace images (no schema change needed, just directory)
-- /uploads/marketplace/{listing_id}/photo_{n}.jpg

-- app_logs → existing table captures all marketplace actions via logAction()
```

---

## 5. Next.js Page Structure & Routes

```
app/
└── marketplace/
    ├── page.tsx                     ← Browse listings (public to members)
    ├── new/
    │   └── page.tsx                 ← Create new listing form
    ├── [id]/
    │   └── page.tsx                 ← Listing detail view
    ├── [id]/edit/
    │   └── page.tsx                 ← Edit own listing
    ├── my-listings/
    │   └── page.tsx                 ← My listings dashboard
    ├── messages/
    │   └── page.tsx                 ← Inbox (all conversations)
    │   └── [listingId]/
    │       └── page.tsx             ← Conversation thread
    └── store/
        └── page.tsx                 ← Official HGF Store section

app/(admin)/
└── admin/
    └── marketplace/
        ├── page.tsx                 ← Admin listing management
        ├── reports/
        │   └── page.tsx             ← Moderation queue
        └── store/
            └── page.tsx             ← Manage official store inventory
```

---

## 6. Next.js API Routes (Route Handlers)

```
app/api/marketplace/
├── listings/
│   ├── route.ts              ← GET (browse/search), POST (create)
│   └── [id]/
│       ├── route.ts          ← GET (detail), PATCH (update), DELETE (remove)
│       ├── photos/
│       │   └── route.ts      ← POST (upload photos), DELETE (remove photo)
│       ├── report/
│       │   └── route.ts      ← POST (submit report)
│       └── status/
│           └── route.ts      ← PATCH (mark sold/reserved/active)
├── messages/
│   ├── route.ts              ← GET (inbox), POST (send message)
│   └── [listingId]/
│       └── route.ts          ← GET (thread), PATCH (mark read)
└── store/
    ├── route.ts              ← GET (store items), POST (add item — admin only)
    └── [id]/
        └── route.ts          ← PATCH (edit), DELETE (remove)
```

---

## 7. Key API Endpoints Spec

### GET `/api/marketplace/listings`
**Query params:**
```
?type=sale|trade|free|service|borrow
&category=Electronics
&min_price=0&max_price=5000
&sort=newest|price_asc|price_desc
&search=laptop
&page=1&limit=20
```
**Returns:**
```json
{
  "listings": [
    {
      "id": 1,
      "title": "HP Laptop — Good Condition",
      "price_label": "P8,500",
      "condition_type": "good",
      "listing_type": "sale",
      "category": "Electronics",
      "seller": { "id": 42, "name": "John Doe", "type": "Family Member" },
      "cover_photo": "/uploads/marketplace/1/photo_0.jpg",
      "created_at": "2026-02-22T08:00:00"
    }
  ],
  "pagination": { "page": 1, "total": 54, "pages": 3 }
}
```

### POST `/api/marketplace/listings`
**Requires:** Authenticated, `status = 'active'`
```json
{
  "title": "HP Laptop",
  "description": "...",
  "listing_type": "sale",
  "category": "Electronics",
  "price": 8500,
  "price_label": "P8,500",
  "condition_type": "good",
  "location_area": "Buhangin, Davao City"
}
```
→ Creates listing, returns `{ id, ... }`. Photos uploaded separately via `POST /api/marketplace/listings/{id}/photos`.

### PATCH `/api/marketplace/listings/{id}/status`
```json
{ "status": "sold" }
```
→ Only listing owner or admin can change status.

### POST `/api/marketplace/messages`
```json
{
  "listing_id": 1,
  "receiver_id": 42,
  "message": "Is this still available?"
}
```
→ Creates message thread, sends SMS notification to seller via SMS-it pipeline.

---

## 8. File Upload Strategy

### For PHP Backend (Current / Transition Phase)
- Upload to `uploads/marketplace/{listing_id}/photo_{sort_order}.jpg`
- Max 5 photos per listing
- Max 5MB per photo
- Resize to 1200×900 max using GD library
- Cover photo = `sort_order = 0`

### For Next.js (Target)
- Use **AWS S3** or **Cloudflare R2**
- Client requests pre-signed upload URL from `/api/marketplace/listings/{id}/photos`
- Client uploads directly to S3 (browser-to-S3, no PHP/Node proxy needed)
- Store S3 key in `marketplace_listing_photos.photo_path`
- Serve via CloudFront CDN URL

---

## 9. UI/UX Design Notes for Next.js

### Browse Page (`/marketplace`)
- CSS Grid: 2 cols mobile, 3 cols tablet, 4 cols desktop
- Each card: cover photo (aspect-ratio 4:3), title, price badge, seller name + member type, "X days left" countdown
- Filter sidebar (collapsible on mobile)
- Infinite scroll or pagination
- Search bar at top (keyboard shortcut: `/` to focus)

### Listing Detail Page (`/marketplace/[id]`)
- Photo gallery with lightbox: main image + 4 thumbnails
- Title, price, description
- Condition badge
- Seller card: avatar, name, member type, join date, member since, "View [N] other listings"
- "I'm Interested" button → opens inline message composer
- Report button (small, grey)
- Share button (copies link)
- Similar listings at bottom (same category)

### Create Listing Page (`/marketplace/new`)
- Step-based form (prevents abandonment):
  1. What are you listing? (Listing Type radio cards with icons)
  2. Category and details (title, description, condition, price)
  3. Photos (drag-and-drop upload, 5 max, reorderable)
  4. Location and review → Submit
- Auto-save draft to localStorage every 30 seconds
- Phone number privacy: warn that exact address is never shown, only general area

### My Listings (`/marketplace/my-listings`)
- Tab-based: Active | Reserved | Sold | Expired
- Each listing shows: cover photo, title, price, days remaining, view count, messages count
- Quick actions: Mark as Sold, Edit, Delete

---

## 10. Admin Moderation Panel (`/admin/marketplace`)

| Feature | Description |
|---------|-------------|
| All listings table | Sortable by date, status, seller, category |
| Quick remove | One-click remove listing with reason |
| Reports queue | Table of reported listings, mark reviewed/dismissed |
| Seller history | View all listings from a specific member |
| Official store management | Add/edit/remove HGF Official Store items |
| Analytics | Total listings, most active sellers, category breakdown |

---

## 11. SMS Notification Integration

When someone sends a message to a seller, use the existing SMS batch pipeline:

```
POST /api/marketplace/messages
  → Insert into marketplace_messages
  → Check if seller has phone number
  → Insert into custom_sms_batches (source = 'marketplace')
  → Insert into custom_sms_batch_recipients with personalized message:
      "Hi [Seller Name], [Buyer Name] is interested in your listing '[Title]'. 
       Log in to HGF Connect to view the message: https://app.houseofgrace.ph/?page=marketplace"
  → Existing cron picks it up within 2 minutes
```

---

## 12. Implementation Phases

### Phase 1 — MVP (Start Here)
- [ ] Create database tables (`marketplace_listings`, `marketplace_listing_photos`)
- [ ] Browse listings page (read-only, no messages)
- [ ] Create listing form (no photos yet)
- [ ] View listing detail
- [ ] My listings page (list own listings, mark sold)
- [ ] Basic admin management (view all, remove listing)

### Phase 2 — Photos & Messaging
- [ ] Photo upload (S3 or local `uploads/marketplace/`)
- [ ] Internal messages system (`marketplace_messages` table)
- [ ] Inbox page and conversation threads
- [ ] SMS notification on new message

### Phase 3 — Official HGF Store
- [ ] Separate store section (admin-only create)
- [ ] Order inquiry form (buyer → admin)
- [ ] Admin order management

### Phase 4 — Community Features
- [ ] Report listing
- [ ] Saved/Bookmarked listings
- [ ] Share listing (copy link)
- [ ] Seller ratings
- [ ] Advanced search with map (for location filtering)

---

## 13. Integration Points with Existing System

| Integration | How |
|------------|-----|
| **Auth** | Same NextAuth session / PHP `$_SESSION['user_id']` |
| **Member profile** | Listing shows seller profile data from `members` table |
| **Member directory** | Link from directory to seller's listings |
| **SMS** | All notifications go through `custom_sms_batches` cron pipeline |
| **Admin dashboard** | Admin overview shows total listings, new reports |
| **Audit log** | All CRUD operations logged to `app_logs` via `logAction()` |
| **Navigation** | Marketplace link already in `navigation.php` (role = authenticated) |

---

## 14. Reference Files

| File | What to Read |
|------|-------------|
| `views/pages/marketplace.php` | Current stub — vision copy and 3 feature cards |
| `views/pages/home.php` lines 62-126 | Member Marketplace + HGF Store "coming soon" cards |
| `views/pages/home.php` lines 39-82 | Feature grid including "Holistic Marketplace" feature tile |
| `views/pages/member-directory.php` | Member listing pattern to reference for UI design |
| `ajax/user_actions.php` | Pattern for AJAX CRUD endpoints to replicate |
| `utils/functions.php` | `formatPhoneNumber()` for seller phone display |
| `utils/sms.php` | `sendSms()` to call for message notifications |
| `database/schema.sql` | Existing table patterns to match for new tables |
| `uploads/` | Directory where uploaded files go (create `marketplace/` subfolder) |
