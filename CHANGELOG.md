# Changelog

All notable changes to HGF Connect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v2.42.1] — 2026-08-12
### Fixed
- **Late Event Reminders Support**: Updated the reminder generation cron API `/api/sms/reminders/check` to automatically detect when a new event is created late (after the standard 7:00 AM same-day reminder slot, but less than 12 hours before the event starts). In this scenario, it generates and immediately sends an "urgent" reminder message using the event type's urgent SMS template.

## [v2.42.0] — 2026-08-12
### Added
- **Sermon Duration Predictor**: Created a real-time speech/preaching duration calculator widget in the editor header. It realistically predicts the duration in minutes/seconds using word count (at 110 WPM preaching pace) combined with emphasis pauses (1.5s per highlighted word/phrase), heading transitions (2.0s per H1/H2), and scripture blocks or cues (3.0s per blockquote/cue).
- **Service Target Alerts**: Evaluates estimated duration against service target limits (20-30 minutes for Grace Night, 35-40 minutes for Sunday Service) and displays a color-coded status badge ("Good", "Short", "Too Long").

## [v2.41.1] — 2026-08-12
### Fixed
- **Refresh Password Retention**: Replaced the local in-memory folder password cache with a `sessionStorage`-backed Proxy to preserve authenticated folder passwords across page refreshes.
- **Auto-Prompt on Save Failure**: Configured the server save handler to immediately trigger the File Manager's password authentication prompt on 403 (unauthorized/password needed) responses, allowing seamless re-saving.

## [v2.41.0] — 2026-08-12
### Added
- **Highlight Font Size Adjustment**: Integrated Font Increase (`▲ Font`) and Decrease (`▼ Font`) buttons in the editor toolbar to scale highlight sizes dynamically.
- **Font Sizing Keyboard Shortcuts**: Added keyboard shortcuts to adjust text highlight sizing (`Option+Command+Up/Down Arrow` on macOS, and `Ctrl+Up/Down Arrow` on Windows/Linux).

## [v2.40.1] — 2026-08-12
### Added
- **Preset Blue Highlight**: Added Blue (`#2563eb`) to the list of quick preset colors in the editor context selection toast.
### Fixed
- **Highlight Overflow on Enter**: Implemented an Enter key handler in the rich editor to prevent highlight styling from leaking into new paragraphs when pressing Enter at the end of a highlighted section.

## [v2.40.0] — 2026-08-12
### Added
- **Editor Text Highlighter**: Added a text highlighter context toast that displays near the cursor on text selection in "THE WORD" scripture delivery tool, with options to highlight words with Yellow, Green, or Red background (keeping text white and bold) and a toggle for bold/unbold.
- **Custom Color Picker Toolbar Tool**: Integrated a custom color picker marker in the main toolbar, allowing pastors to choose any custom color via a native color input and apply it to their selected text.
- **Prompter Selection Normalization**: Configured CSS resets in the prompter scroll view to bypass `.word-marker` highlights, ensuring highlighted words appear identical in both editor and prompter modes.

## [v2.39.8] — 2026-07-15
### Changed
- **Preserved Original Presentation Files**: Updated `lib/presentationProcessor.ts` to copy and return the original uploaded presentation file (be it `.pptx` or `.pdf`) to the public downloads folder, rather than replacing it with a JPEG-only `.pptx` file. This preserves all native text layers, fonts, shapes, and formatting, allowing the multimedia team to edit the presentation or copy scriptures natively.
- **Dynamic Download Extension Badges**: Configured all presentation download buttons on the public resources, member quiz, and multimedia dashboard pages to dynamically render (.pdf) or (.pptx) labels matching the preserved file type.

## [v2.39.7] — 2026-07-15
### Fixed
- **Presentation Download File Extension Mismatch**: Resolved issue where downloading sermon presentations (PPTX) originally uploaded as PDFs resulted in a file with a `.pdf` extension. The dashboard download link now dynamically normalizes the `download` filename to ensure it always ends with `.pptx`.

## [v2.39.6] — 2026-07-12
### Fixed
- **Punctuation-Insensitive Verse Ordering**: Modified the `SCRIPTURE_ORDERING` challenge validation in the quiz submission handler (`app/api/quiz/submit/route.ts`) to be punctuation-insensitive. It now normalizes both the correct segments and user segments (by stripping all non-alphanumeric characters) before checking the arrangement. This resolves grading errors caused by trailing periods or punctuation mismatched between question answers and draggable options in the database.
- **Database Credit Correction**: Corrected a user's previous correct verse builder submission (Submission ID 29) on the database that was graded as incorrect due to a trailing period discrepancy.

## [v2.39.5] — 2026-07-09
### Fixed
- **Cascade Deletion of Event Feed Posts**: Configured the `DELETE /api/events/[id]` API handler to dynamically delete any linked feed posts (matching the `[event:${id}]` bracket code in post content) when an event is deleted. This prevents orphaned event posts from displaying on the community feed wall when duplicate or misconfigured events are deleted.
- **Production Database Cleanup**: Executed a script on the production database to purge all existing orphaned event posts (successfully deleted posts ID 142 and ID 91).

## [v2.39.4] — 2026-07-09
### Added
- **Slide-Based Quiz Generation**: Made the manual sermon notes input text optional on the Quiz Admin page. If slides are uploaded for the linked Sunday service event, the AI generator automatically falls back to generating progressive quiz challenges using the event's slide OCR commentary summary, streamlining weekly quiz creation.

## [v2.39.3] — 2026-07-09
### Fixed
- **Deleted Event Feed Fallback**: Added a text-parsing fallback mechanism to event posts that refers to deleted/missing database event records. This extracts the date from the post text itself (e.g., `🗓️ Sunday, July 5, 2026`) and rewrites the header prefix from "New Event" to "Event" if that date has passed, fixing past events that remained marked as "New Event" after their DB event record was recreated or deleted.

## [v2.39.2] — 2026-07-09
### Changed
- **Past Event Feed Normalization**: Configured the Social Feed posts and database notification routers to dynamically detect if an event has already occurred. Past events are now correctly prefixed as "Event:" instead of "New Event:", preventing user confusion when slides are updated after the service.

## [v2.39.1] — 2026-07-09
### Changed
- **Sleek Segmented Tab UI**: Upgraded the simple text buttons on the event attendance analytics dashboard into a segmented control track (light slate grey track with white elevated active pills, drop-shadows, and smooth micro-animations) to make them look distinct and interactive instead of resembling static text.
- **Legacy Attendance App Enhancements**: Integrated a helpful reminder notice into the zero-records report view inside `reports_widget.php` on the server. Added instructions suggesting manual logging using the **Log Attendance / Add Member to Event** tool, and updated the section title to clarify functionality.

## [v2.39.0] — 2026-07-09
### Added
- **Dynamic Search & Filtering**: Added a real-time text filter bar to the `/admin/events` list, permitting lookup of events by title, speaker, location, and description.
- **Dynamic Member Auto-Segmentation Alignment**: Integrated the dynamic auto-segmentation algorithm into the Event Attendance Analytics dashboard to evaluate and align active/inactive/guest counts exactly with the general admin dashboard.
- **Attendance Unrecorded Detection & Toggling**: Introduced automated "No Attendance Logged" notices for past events with zero logs. Added a "Mark as Attendance Unrecorded" button and a modal confirmation mechanism that marks events as unrecorded in the database (stored under a `[ATTENDANCE_UNRECORDED]` description prefix), preventing false absentee notifications and follow-up alerts.
- **Future Scheduled Event Notices**: Implemented visual notifications and greyed-out visual styles to denote future/pending events and prevent premature follow-up tracking or SMS dispatches.

## [v2.38.0] — 2026-07-08
### Added
- **Event Attendance Analytics Dashboard**: Designed and implemented a comprehensive analytics dashboard at `/admin/events/[id]/analytics` for detailed event-based tracking. Includes counts of active attendees, returned inactive members, new guests, and active absentees.
- **Pastoral Follow-up & SMS Outreach**: Created dynamic segments to calculate consecutive member absences (e.g. absent for 3+ weeks). Added single-member and multi-select bulk SMS follow-up capabilities directly integrated into the dashboard using standard SMS protocols (no raw protocols in text).
- **Admin Events KPI widgets**: Injected summary metrics cards at the top of the `/admin/events` list, showing total events, Sunday services, active presentations, and monthly activity counts.

## [v2.37.12] — 2026-07-08
### Fixed
- **Memory Optimization for Large PDF Uploads**: Introduced a 20MB file size threshold check inside `lib/presentationProcessor.ts`. Large PDF presentations exceeding 20MB now bypass the memory-heavy `pdf-parse` text extraction step, preventing Out-Of-Memory (OOM) crashes and CPU thread blocks on the droplet.

## [v2.37.11] — 2026-07-08
### Fixed
- **CSS Grid Column Overflow**: Replaced `2fr 1fr` columns with `minmax(0, 2fr) minmax(0, 1fr)` inside `MultimediaDashboardClient.tsx` to prevent wide children from expanding grid boundaries and creating a horizontal scrollbar.
- **Server Font Installation**: Provisioned Microsoft Core Fonts and Noto Core Fonts on the production server to resolve font-substitution formatting and alignment clutter during LibreOffice conversions.

## [v2.37.10] — 2026-07-08
### Changed
- **Dynamic Post Image Formatting**: Enhanced single-photo feed post rendering in `PostCard.tsx` to display full portrait and landscape images dynamically (similar to Facebook) instead of cropping them to a fixed 200px box.
- **Multimedia Admin Mobile Optimizations**: Restructured the layout and container padding on the Multimedia Pre-service Operations page to scale correctly and prevent horizontal scrolling or cut-off download buttons on smaller phone displays.

## [v2.37.9] — 2026-07-08
### Fixed
- **AI Sermon Casing Normalization**: Added cleanup rules to the background AI sermon processor's system prompt to normalize garbled or mixed-casing text (e.g. "jOHN 3:16" or "thE lamb") caused by non-standard PDF font map decodings.

## [v2.37.8] — 2026-07-08
### Fixed
- **Sermon Upload Worker Resolution**: Resolved presentation (PDF/PPTX) upload stalling issue caused by Webpack/Turbopack dynamic worker module resolution failures inside the server-side Next.js bundle by specifying an absolute Tesseract.js `workerPath` and `cachePath`. Also optimized thread pools by instantiating and reusing a single Tesseract worker across each slide batch.

## [v2.37.7] — 2026-07-05
### Changed
- **Protocol Stripping**: Removed `https://` from all copied and shared invite URLs to prevent carrier/telco SMS filter blocks.

## [v2.37.6] — 2026-07-05
### Added
- **LIFE Group Invitations**: Integrated an interactive invite-sharing block on the signup success screen, encouraging users to share and copy customizable messages with loved ones.
- **Open Graph Optimization**: Added Open Graph and Twitter Card tags referencing a custom Filipino cozy cafe LIFE Group Open Graph banner.

## [v2.37.5] — 2026-07-05
### Added
- **Click-to-Copy Form Link**: Transformed the static link in the LIFE Group QR presentation modal into an interactive, one-click copy button with instant state feedback.

## [v2.37.4] — 2026-07-05
### Added
- **SMS Branding & Slogan**: Appended the disciple-making slogan tag *"let's go and make disciple, let's do life together!"* to all cell group SMS broadcasts.

## [v2.37.3] — 2026-07-05
### Added
- **LIFE Group SMS Alerts**: Integrated automatic SMS alerts to the 8 chosen pastors/leaders upon new public cell group registrations.
- **Appointment Confirmation SMS**: Added a ConfirmModal trigger on the admin page to send notification SMS to the pastor upon appointment.
- **Mobile Card View**: Built a responsive mobile card list view inside `LifeGroupAdminClient` to provide a premium layout on smartphones.

## [v2.37.2] — 2026-07-05
### Added
- **LIFE Group Admin Actions**: Added full edit, delete, and pastor/leader appointment capabilities. Built inline dropdown assignments referencing active moderators/admins (pastors).
- **LIFE Group Analytics Dashboard**: Extended stats with total signups, action required (pending assignment), appointed counts, and automatic area distribution segments.
- **Inline Ministry Selection**: Integrated a "+ Manage" checklist modal overlay on both desktop table and mobile card views in the Members admin page for instantaneous ministry assignments.
### Added
- **Admin Sidebar Integration**: Registered the "Life Group" page link in the left-hand sidebar menu (`AdminSidebar.tsx`) for quick and continuous access across all administrative panels.

## [v2.37.0] — 2026-07-05
### Added
- **Public LIFE Group Registration Form**: Created a public access signup form page `/lifegroup/join` collecting name, age, and area (including central, north, south/west, and custom other details) with a premium confirmation view.
- **LIFE Group Admin dashboard**: Built an admin review control interface `/admin/lifegroup` to view, filter, and search registrants with full CSV/excel download capabilities.
- **Sanctuary Screen QR Code Modal**: Added a projection modal in the admin page displaying a scan-to-join QR code for easy screen projection during Sunday services.
- **Database Schema**: Added the `lifegroup_registrations` model mapping to `schema.prisma`.

## [v2.36.16] — 2026-07-03
### Changed
- **Location Area Presentation Layout**: Extracted the location badge from the inline tags row into its own dedicated block line container. Displays on its own line with flex-start alignment and light container borders to wrap long addresses cleanly without stretching the tags flow.
- **Client Coupon Self-Healing**: Added dynamic client-side rewrite in `ListingDetailClient.tsx` to automatically map legacy `"DIRECTXX"` coupon codes loaded from `localStorage` or `previouslyRevealed` server configurations to the corrected `"HGFCHURCHXX"` campaign structure.

## [v2.36.15] — 2026-07-03
### Added
- **Referrer Context in SMS Alerts**: Appended the referrer's identity details directly to the seller notification SMS and in-app alerts (e.g. `referred by member John Doe` or `referred via HGF Church campaign ads`) to give listers immediate clarity on where leads originated.

## [v2.36.14] — 2026-07-03
### Added
- **Listing Location Auto-Prepopulation**: Implemented auto-prepopulation of the "Location Area" field on the listing creation (Sell) page. The client queries the user's previous listings, retrieves the most recent listing's location, and inserts it as the default input value.

## [v2.36.13] — 2026-07-03
### Fixed
- **Mobile Responsive Header Alignment**: Resolved a layout overflow bug on narrow mobile screens (under 440px) where the top navigation elements would stretch wider than the screen, pushing the hamburger menu off the right edge. On smaller viewports, the "BETA vX.X.X" badge and the user's name/arrow are now dynamically hidden, transforming the avatar button into a clean, compact round profile picture, ensuring uniform layout across all phone models.

## [v2.36.12] — 2026-07-03
### Added
- **HGF Church Fallback Referrer**: Added automatic fallback to HGF Church system account for direct marketplace visitors. Generates custom `HGFCHURCHXX` coupon codes (zero-padded listing ID).
- **Auto-Settle & Community Feed Celebration**: Implemented auto-transition of HGF Church claims to the `received` state upon seller payment, automatically generating a public feed celebration post praising God on behalf of HGF Church.
- **Enhanced Seller Contact Card UI**: Redesigned the contact section in the discount reveal component to display a modern, verified-looking contact card with formatted phone numbers, a one-press clipboard copy button (with `✓ Copied` state feedback), and direct dialing buttons.

## [v2.36.11] — 2026-07-03
### Fixed
- **Prospect Notification Alerts**: Corrected the trigger conditions inside `app/api/marketplace/prospects/route.ts` to notify sellers via SMS and in-app notifications on both `reveal` and `contact` prospect forms, rather than strictly on `contact`.
- **Prospect SMS Backfill**: Executed a script to backfill the missing notification SMS to listers for the four most recent prospects from the past 30 days.

## [v2.36.10] — 2026-07-03
### Changed
- **Polite Public Version Updates**: Restricted the `VersionGuard` update modal popup to authenticated members (`sessionStatus === "authenticated"`). For unauthenticated public visitors, the modal is hidden, and version updates are applied transparently by listening to page/route transitions: the app triggers a cache-clearing service worker update and hard-reload on the new pathname whenever they navigate away.

## [v2.36.9] — 2026-07-03
### Changed
- **Checkmark Bullet List Layout**: Refactored `renderFormattedText` in `ListingDetailClient.tsx` to automatically detect list items starting with check emojis (`✅`, `☑`, `✔️`, `✔`) and render them with `listStyleType: "none"` and a matching negative left margin (`marginLeft: "-1.1rem"`). This removes the redundant dot bullets for checkmark lines while preserving them for normal specification items.

## [v2.36.8] — 2026-07-03
### Fixed
- **Database-Backed Prospect Restoring**: Integrated a database check on server-side detail page loads (`page.tsx`) to lookup any existing prospect record matching the current user's email/phone. Automatically populates and hydrates the `revealed` discount/coupon UI on the client if already revealed previously (even if localStorage is cleared or viewed on a different device).

## [v2.36.7] — 2026-07-03
### Changed
- **SMS Prospect Copy Update**: Softened the SMS notification wording sent to sellers when a prospect contacts them to say they are "interested in it" rather than "wants to purchase it".

## [v2.36.6] — 2026-07-03
### Changed
- **StewardShop Branding Suffix**: Renamed title suffix from `HGF Marketplace` to `HGF StewardShop` across public listing detail routes and love gifts page metadata.

## [v2.36.5] — 2026-07-03
### Added
- **Prospect Submission Seller Notifications**: Configured `POST /api/marketplace/prospects` route to create an in-app notification and send an SMS alert to the listing seller when a new contact request prospect is submitted.
- **Short Share Links & Formatting**: Refactored `ListingDetailClient.tsx` to unify share actions using the `hgfapp.link` short link domain, position the short link URL at the bottom of native share triggers, and use dynamic calculated discount percentages (e.g. `(58% OFF) reveal the discounted price!`) instead of static labels.

## [v2.36.4] — 2026-07-03
### Fixed
- **Stale Discount State Cleanup**: Added a check to the client component mount `useEffect` to clear any stale revealed discount state in both local state and `localStorage` if the listing's active discount status becomes false (e.g. if the discount is set to 0 or removed).

## [v2.36.3] — 2026-07-03
### Added
- **Listing Description Markdown Parsing**: Added a basic Markdown-like parser (`renderFormattedText`) in the listing detail page to render headers (`#`, `##`, `###`), bold formatting (`**text**`), bullet lists (`*`, `-`), and line breaks beautifully instead of rendering raw markdown tags.
- **SMS Flagging for Invalid Phone Numbers**: Automatically flags a member's phone number as invalid (`phoneInvalid = true`) in the database upon validation or gateway delivery failures, preventing redundant SMS retry attempts.
- **SMS Flag Reset on Phone Number Updates**: Automatically resets `phoneInvalid = false` when a member or admin updates the phone number in `app/api/members/[id]/route.ts`.

### Fixed
- **StewardShop P0 Discount Bug**: Fixed a bug where a listing with a discounted price of `₱0` (or empty placeholder defaults) was treated as having an active discount (displaying "100% OFF" and a strike-through). The system now requires the discounted price to be strictly greater than 0 for `hasDiscount` to be true.

## [v2.36.2] — 2026-07-03
### Added
- **Listing Header Share Button**: A share button (`📤`) is now available directly in the listing header (next to the title) for all users, enabling quick sharing even if no Love Gift is configured.
- **Discount Strikethrough Share Formatting**: Native sharing copy for all share actions (header share, love-gift share, and owner share) now formats the share text to include a unicode-strikethrough version of the original price followed by `(reveal discount price)`, e.g. `Take All Garage Sale — ₱̶1̶2̶,̶0̶0̶0̶ (reveal discount price)`.

## [v2.36.1] — 2026-07-03
### Added
- **StewardShop Directory Price Strikethrough & Badges**: Strikethrough is now rendered on the original price for discounted listings directly on the main directory page, alongside a "🔒 Reveal Price" badge.
- **Marketplace Listing Deep-Linking**: Clicking a discounted item on the main directory page deep-links directly to `/stewardshop/[id]?reveal=true`, which automatically opens the lead capture and reveal discount modal on page load.

## [v2.36.0] — 2026-07-03
### Added
- **StewardShop Direct Reveal**: Allowed all logged-in members and direct public visitors to reveal discount codes on marketplace listings, removing the previous restriction that only allowed reveals via shared referral links.
- **Pre-filled Lead Forms**: Integrates database session loading to pre-fill the name, mobile number, and email inputs inside the contact and discount reveal forms for authenticated community members.
- **Direct Lead Coupon Code fallback**: Returns a standardized fallback coupon code format (`DIRECT[listingId]`) for direct visitors who reveal listing discounts without a referrer code.
- **Catchy Discount OpenGraph Metadata**: Enhances listing metadata generation to dynamically strike out the original listing price (using Unicode text-combining strikethrough characters) and appends a catchy lead call-to-action (`(Reveal discount price - you won't believe the new price!)`) inside both OpenGraph and page headers.

### Changed
- **Pending Profile Administrative Access**: Allowed logged-in administrators, moderators, and the profile owner to view their own profile even if the account is in `pending` approval status, resolving 404 errors.

## [v2.35.0] — 2026-06-28
### Added
- **Monthly Grid-Calendar Attendance Timeline**: Replaced the flat horizontal sparkline timeline in the Member Attendance History modal with a modern, structured calendar monthly grid:
  - Divides the year into 12 month cards, listing the month name and the member's monthly attendance ratio (e.g. `2/4`).
  - Represents each service as a dedicated interactive circle badge containing a day indicator: `S` for Sunday Service, `M` for Midweek Service, or `Sp` for Special Event.
  - Color-codes circles: solid teal (`#4EB1CB`) for attended, and dashed light gray for missed.
- **Pinned Service Details Panel**: Added an interactive details summary panel beneath the grid. Clicking any service circle pins the full details (Date, Topic, Preacher, and Type) on screen.
- **Preacher Metrics Clarification**:
  - Re-labeled correlation statistics to plain-English `(X of Y attended)` format for instant readability.
  - Renamed database `Unknown Preacher` category to `Guest / Unspecified Speaker`.

## [v2.34.2] — 2026-06-28
### Fixed
- **Special Event Services (Ordinations & Celebrations)**: Integrated `special_event` type into the dashboard, trends API, and member stats queries, resolving missing records like the June 14 Ordination Ceremony.
- **Smart Overflow Prevention and Wrapping**:
  - Implemented dynamic translation transforms (`translate(-10%, -100%)` on the left and `translate(-90%, -100%)` on the right) for the timeline hover tooltips to prevent clipping at the card edges.
  - Aligned pointer arrow left offsets dynamically (`15%`, `50%`, `85%`) to align with the selected service dot.
  - Enabled multi-line title wrapping for long sermon topics inside tooltips using `wordBreak: "break-word"` and `whiteSpace: "normal"`.

## [v2.34.1] — 2026-06-28
### Fixed
- **Historical and Midweek Service Inclusion**: Expanded database events queries to capture both Sunday services (`sunday_service`) and Wednesday midweek services (`grace_night`) under both `scheduled` and `completed` status headers, ensuring past completed events populate correctly.
- **Detailed Month/Year Tooltips**: Re-engineered chart tooltips to render highly comprehensive metadata:
  - In By Month view: Lists exact date, service category, preacher/speaker, and exact attendance.
  - In By Year view: Dynamically queries and renders a scrollable list inside the tooltip showing all services that occurred during that month, complete with exact date, sermon name, preacher, and individual attendance numbers.

## [v2.34.0] — 2026-06-28
### Added
- **Member Attendance History Modal**: Replaced the static hover tooltip on the member list `ℹ️` button (for both desktop and mobile layouts) with a clickable trigger that launches a detailed yearly attendance stats modal. Features:
  - An interactive SVG sparkline charting all scheduled Sunday services chronologically. Color codes attended (solid teal) vs. missed (hollow gray) services.
  - Hover tooltip metrics details for each Sunday service showing date, sermon topic, and preacher.
  - **Sermon Preacher Correlation Engine**: Calculates and charts attendance rates grouped by preacher/speaker to highlight attendance dependencies.
  - Quick summary indicators showing total scheduled services, attended services, and percentage rates.
  - Inter-year navigation arrows.
- **Advanced Dashboard Trends Selectors**: Refactored the dashboard trends chart card to default to the current month and added a selectors header to filter and navigate data dynamically:
  - Toggle between **By Month** and **By Year** modes. In By Month mode, it displays individual services. In By Year mode, it groups data and displays average Sunday attendance per month.
  - Dropdown selectors for Year and Month.
  - Previous and Next navigation arrows to chronologically step through months/years.
- **Age Demographic Segment Filters**: Integrated a status dropdown (All / Active Only / Inactive Only) to the Age Distribution donut chart card header, triggering instant client-side segment counts and legend percentage recalculations.

## [v2.33.0] — 2026-06-27
### Added
- **Interactive SVG Dashboard Charts**: Designed and integrated two responsive SVG-based charts to enhance the admin home page UI/UX:
  - **Sunday Service Attendance Trends Chart**: A curved line/area chart tracking weekly Sunday service attendance over the last 8 weeks. Built with smooth grids, a glowing background area fill gradient, and interactive circle plot markers that trigger floating glassmorphic info tooltips showing event metadata and exact metrics on hover.
  - **Age demographic Distribution Donut Chart**: A circular demographic graph illustrating the breakdown of Adults, Youth, and Kids. Supports segment hover scale transitions, interactive legend controls, and dynamic center labels.

## [v2.32.1] — 2026-06-27
### Added
- **Clickable Sorting on Directory Columns**: Enabled clicking on column headers (MEMBER, TYPE, AGE GROUP, VISITS, LAST VISIT, MINISTRIES) to sort the members list directory in ascending and descending orders. Added matching ▲/▼ indicator arrows to the headers.
- **Universal Sorting Dropdown**: Integrated a Sort select filter to the search controls area for a consistent sorting experience on mobile layouts (where table headers are hidden).
- **Segmented Age Group Widgets**: Re-grouped the home page Age Group cards into 6 separate widgets (Active Adults/Youth/Kids under "Active Age Groups" and Inactive Adults/Youth/Kids under "Inactive Age Groups").

## [v2.32.0] — 2026-06-27
### Added
- **Age Groups Support**: Integrated Age Groups ("Adult", "Youth", "Kids") into the church directory and dashboard. Added a responsive Age Groups widgets breakdown section on the admin home page, inline select-editable dropdowns in both desktop table view and mobile card view, and an Age Group filter on the admin members directory.
- **Active Event Switcher Dropdown**: Passed up to 10 upcoming events to the multimedia dashboard and added a Select Active Event dropdown widget to the header next to the Manila Time clock. This allows team members to switch the active dashboard to any future scheduled event and download sermon slide presentations in advance on Saturday (or any other day).

### Changed
- **Sermon Slides Selection Prioritization**: Default-selects the nearest event containing an uploaded presentation file when multiple events occur on the same day, preventing empty duplicate events from overriding and hiding sermon presentations.

## [v2.31.6] — 2026-06-27
### Fixed
- **Large Presentation Uploads (Stuck at 5%)**: Excluded `/api/` paths from the Next.js middleware matcher inside `middleware.ts` and configured `experimental.proxyClientMaxBodySize: "500mb"` in `next.config.js`. This resolves request body truncation issues on files exceeding 10MB, which triggered `TypeError: Failed to parse body as FormData` and left pastors' uploads hanging.

## [v2.31.5] — 2026-06-27
### Added
- **Facebook-Style Inline Headers**: Added inline action text ("updated their profile picture", "updated their cover photo") to the post author headers in `PostCard.tsx` for photo update posts.
- **Community Feed Post Bumping**: Introduced the `bumped_at` timestamp in the database to decouple feed ordering from the original post creation date. Newly commented or replied posts have their `bumped_at` timestamp bumped, causing them to float to the top of the feed while maintaining their original correct `created_at` timestamp in headers (preventing misleading "updated their profile picture 12m ago" text).
- **Photo Posts Backfill**: Implemented `scratch/backfill_photo_posts.mjs` to reconcile historical database records by creating and linking missing posts for old profile/cover photos, and setting their initial `bumped_at` times based on comment timestamps.
- **Legacy Attendance Export referral Source**: Enhanced the legacy attendance report CSV export to include the "Invited By" referral field for each member attendance record.

## [v2.31.4] — 2026-06-26
### Changed
- **Dashboard Stats Widgets**: Enhanced and aligned the dashboard widgets to display the exact segmented breakdowns of community members: Active Members (✅), Inactive Members (💤), Guests (👋), Archived Members (📁), Pending Approval (⏳), and Total Members (📋), matching the frontend tab counts.
- **Member Directory Query Params**: Enabled passing query search parameters (`tab`) to AdminMembersPage to initialize and switch to the correct active tab immediately upon widget redirection.
- **Pending Members Filtering**: Filtered out pending approval members from counting in Active, Inactive, Guests, and Archived lists on both the dashboard and members page directory tabs, resolving count mismatches.

## [v2.31.3] — 2026-06-26
### Fixed
- **Legacy Attendance App SSO Alignment**: Updated the status queries across the legacy PHP application (`/var/www/hgf-legacy/attendance/`) to validate `status != 'archived' AND status != 'pending'` instead of requiring `status = 'active'`, matching the new member dynamic segmentation model and resolving the "User not found or inactive" SSO block.

## [v2.31.2] — 2026-06-26
### Fixed
- **Profile Page (404 Issue)**: Allowed viewing profile pages for all valid community members (approved, active, inactive, guest), throwing a 404 only for archived and pending registrants.
- **Community Directory**: Fixed the directory page fetching parameter that was querying for active status only, ensuring all approved community members display properly.
- **Custom SMS Recipients**: Aligned the custom SMS composer recipient loader to query all valid members, filtering out archived and pending users.

## [v2.31.1] — 2026-06-26
### Added
- **Password Reset Confirmation**: Added a confirmation step modal before executing a password reset.

### Changed
- **Decluttered Status Overrides**: Dynamically filters dropdown override status choices based on their segment, hiding redundant force options.

## [v2.31.0] — 2026-06-26
### Added
- **4th Member Segmentation Tab (Archived)**: Added an "Archived" (📁) tab to isolate members who have left the church or transferred.
- **Attendance Columns**: Added columns for total visits, last visit date, and last event name to the members table. Used responsive hover-tooltips for desktop and an inline details row on mobile card views.
- **Status Override Selectors**: Replaced static status labels with inline dropdown selectors (Auto, Force Active, Force Inactive, Force Guest, Force Archived).

### Changed
- **SMS Exclusions**: Updated birthday check and SMS reminder APIs to exclude members whose status is "Archived".
- **Authentication Block**: Updated WebAuthn and password authentication logic to deny logins for "Archived" users.

## [v2.30.0] — 2026-06-26
### Added
- **Member Segmentation Tabs**: Admin members page now classifies members into 3 attendance-based segments — **Active** (attended within last 30 days, 2+ total), **Inactive** (2+ attendance but none in 30 days), and **Guests** (0–1 attendance records). Each tab shows a count card with icon, count, and label.
- **SMS Guest Exclusion**: SMS event reminder campaigns now automatically exclude guest-classified members (≤1 attendance) from receiving messages. Inactive members are still included for re-engagement purposes.

### Changed
- **Actions Column Redesign**: Replaced the cramped 2-line text-link action bar (View | Deactivate | Reset Pass | Login As | Delete) with clean single-line icon buttons (👁 🔑 🔄 🗑️) with tooltips, both on desktop table and mobile card views.
- **Removed Manual Deactivate/Activate Toggle**: The manual status toggle has been replaced by the automatic attendance-based segmentation system. Members are now classified by their attendance behavior rather than manual admin action.

## [v2.29.9] — 2026-06-26
### Added
- **Profile Settings Gender & Address**: Added `gender` select dropdown (Male, Female) to the profile settings edit page and displayed it under the Personal Details card on the About profile tab. Enabled gender fetching and updating across Next.js APIs.
- **Attendance CSV Export Enhancements**: Updated the legacy attendance app's CSV export script on the production server to query and include `gender`, `age_group`, and `role` (mapped from member `type`) fields in the exported CSV headers and data rows.

## [v2.29.8] — 2026-06-26
### Fixed
- **Database Duplicate Account Merger (v2)**: Executed database duplicate cleanups on the production server to safely merge 9 duplicate member groups (Lance Kirby Ador, Jhundel Bou, Clarizza Delos Santos, Faith/Fatz Pahimnayan, Ritchel Buro, Elana/Ellana Aguan, Rianah Fama, Monique Milliones, and Cabigon Cj/Gershon Cabigon). This preserves their login credentials, biometrics, profiles, and combines their attendance histories, resolving the delta between registered database accounts (340) and active community records (bringing the count to 331).

## [v2.29.7] — 2026-06-15
### Added
- **StewardShop AI Enhancements**: Integrated "✨ AI Enhance" buttons for both Title and Description fields on the listing creation page (`app/(app)/stewardshop/sell/page.tsx`) and the listing edit page (`app/(app)/stewardshop/my-listings/[id]/edit/page.tsx`). Created a dedicated API route (`app/api/ai/enhance-listing/route.ts`) leveraging the Straico API and GPT-4o-mini to refine, structure, and generate catchy community marketplace listings.
- **Quiz Hub Loading Skeleton**: Implemented a matching loading skeleton for the Quiz Hub (`app/(app)/quiz/hub/loading.tsx`).
### Changed
- **Facebook-Style Quiz Shimmer Loader**: Replaced the custom local spinning wheel loaders inside the member Quiz page (`app/(app)/quiz/page.tsx`) and Quiz Hub (`app/(app)/quiz/hub/page.tsx`) with the proper Facebook-style skeleton shimmers, ensuring smooth visual transitions during content updates.
- **Brand Title Cleanup**: Removed all references to "Brand Hub" or custom branding tags across the Quiz pages, renaming it strictly to "HGF Quiz for Christ Page".

## [v2.29.6] — 2026-06-15
### Fixed
- **PWA Stale Auth State & Artifacts**: Fixed a critical caching regression where logging out would leave navigation bar docks, FAB buttons, and user profile setting items visible.
  - Excluded the root path `/` from the service worker's `PRECACHE` to prevent caching dynamic session states.
  - Simplified the service worker's navigation strategy to fetch pages directly from the network (bypassing caches) and use `offline.html` only as a fallback.
  - Implemented `<ClientAuthGuard />` in `app/(app)/layout.tsx` to immediately redirect unauthenticated users to `/login` client-side if their session becomes invalid or is cleared.
  - Forced dynamic rendering on the home page (`app/page.tsx`) using `export const dynamic = "force-dynamic"` to guarantee fresh server checks.

## [v2.29.5] — 2026-06-15
### Added
- **StewardShop Grid & Detail Skeletons**: Implemented Next.js route loading skeleton screens using the Facebook-style shimmer pulse primitives for the public listing grid page (`app/(public)/stewardshop/loading.tsx`) and single listing detail view (`app/(public)/stewardshop/[id]/loading.tsx`). This resolves perceived visual lag during SSR and IP/geolocation lookups.
- **Events Grid & Detail Skeletons**: Added structured route loader overlays for `/events` (`app/(public)/events/loading.tsx`) and event detail views (`app/(public)/event/[id]/loading.tsx`).
- **Sermon Resources Loading Screen**: Created a widescreen slide carousel and takeaway layout loading skeleton (`app/(public)/resources/loading.tsx`).
### Changed
- **Premium Directory Loader**: Replaced the basic CSS opacity pulse boxes inside `app/(public)/directory/page.tsx` with high-fidelity `SkeletonCard` shimmer structures to match the brand layout.

## [v2.29.4] — 2026-06-15
### Fixed
- **Robust Hamburger Menu Icons**: Replaced the Unicode `☰` and `✕` characters in `UnifiedHeader.tsx` and `PublicNav.tsx` navigation buttons with inline vector SVGs. This fixes issues where navigation buttons were hidden or displayed as blank on some custom Android builds (like Oppo ColorOS, Huawei EMUI, etc.) which lack these symbols in their system font files.

## [v2.29.3] — 2026-06-15
### Fixed
- **Admin Member Type Selector Defaulting**: Corrected the inline member Type dropdown option values to match the database/Prisma `MemberType` CamelCase strings (e.g. `FamilyMember`, `GrowingFriend`, `NewFriend` instead of spaced variants). This resolves the browser layout bug where all selector default values incorrectly loaded as "Family Member" instead of the member's actual stored database status type.

## [v2.29.2] — 2026-06-15
### Added
- **Editable Member Types in Admin**: Replaced the plain text member Type badges in the administration dashboard (`app/admin/members/AdminMembersClient.tsx`) with styled inline select dropdowns. This allows admins and moderators to quickly transition users between "New Friend", "Growing Friend", and "Family Member" statuses dynamically on both desktop (table view) and mobile (card list).

## [v2.29.1] — 2026-06-15
### Changed
- **Profile Edit Tab Consolidation**: Merged Contact and Bio & Verse fields directly into the Personal tab under distinct, premium section headers. Merged SMS event alerts into the Privacy tab. Reordered and positioned the Ministries tab next to the Personal tab.

## [v2.29.0] — 2026-06-15
### Added
- **Ministry Application System**: Added a new interactive "Ministries" tab on the user profile editor page (`app/(public)/profile/edit/page.tsx`) with real-time active, pending, and unsaved state rendering, plus type warning restrictions for "New Friend" accounts.
- **Admin Review Action Queue**: Created a double-tab registrations and ministry requests panel in the admin review dashboard (`app/admin/review/AdminReviewClient.tsx` and `app/admin/review/page.tsx`) to approve/deny ministry requests.
- **Admin Review API Route**: Implemented `POST /api/ministries/review` to handle admin approvals/rejections, write to `db.appLog`, and dispatch congratulatory welcome SMS messages automatically routed through the `HGFMinistry` Sender ID.
- **Member Ministries API Loader**: Updated `GET /api/members/[id]` to return pending ministries for the user themselves and admin/moderator roles, enabling pending application visibility.

## [v2.28.6] — 2026-06-14
### Added
- **Database Duplicate Account Merger**: Created and executed `scratch/merge_duplicates.php` on production to safely merge 12 duplicate member groups, preserving the newer Auth.js credentials while transferring all attendance records (e.g. merging Rechelle Buro's 49 + 40 records to a total of 89 records).
- **Attendance Check-in SMS Backfill Script**: Developed `scratch/queue_today_attendance_sms.php` to identify and queue 74 customized attendance check-in SMS notifications for today's service attendees.

## [v2.28.5] — 2026-06-14
### Added
- **Admin Approval Welcome SMS Notification**: Configured the member status update endpoint (`PATCH /api/members/[id]`) to automatically trigger a welcome SMS notification (routed under the `"HGF Connect"` sender ID) when a pending registrant's status is updated to `"active"`.

## [v2.28.4] — 2026-06-14
### Fixed
- **Fixed Service Worker Cross-Cache Poisoning from Redirects**: Added a check to prevent caching of redirected navigation requests (`!r.redirected`) in both app shell and default fetch handlers, ensuring that pages like `/login` are not incorrectly cached with the HTML structure of private dashboard routes (like `/admin` or `/feed`) when middleware triggers automatic redirects.

## [v2.28.3] — 2026-06-14
### Fixed
- **Resolved Next.js Client-Side Router Cache Collisions on Login**: Switched from `router.push` to `window.location.href` for navigating to `/feed` upon successful login, bypassing the stale client-side router cache that previously caused users to be redirected back to the login page on their first attempt.
- **Prevented Logout Aborts**: Restored NextAuth's native callback redirect handling in `triggerLogout` to ensure the browser processes the HTTP-only cookie clearing headers before navigation, resolving issues where users remained signed in after their first logout attempt.

## [v2.28.2] — 2026-06-14
### Fixed
- **Optimized Login Responsiveness**: Prevented the "Sign In" and "Authenticating..." loading states from resetting early on successful credential/biometric submissions, ensuring the button status remains disabled and visual feedback is maintained throughout the route transition to `/feed`.
- **Instant Secure Logout Utility**: Introduced a centralized `triggerLogout` utility and a global, glassmorphic `<LogoutOverlay />` loader that activates immediately on sign-out to block concurrent clicks. Implemented an asynchronous sign-out race with a `1.2-second` safety fallback timeout that forces a redirect to the home page even if NextAuth network requests hang on poor mobile connections.

## [v2.28.1] — 2026-06-13
### Fixed
- **Carousel Spacing & Dot Indicators Clearance**: Increased the dashboard `HeroCarousel` fixed height to `235px` (along with the loading skeleton) to provide adequate clearance for event slides with 2-line titles and location text, preventing the dot indicators from being pushed down and clipped by `overflow: hidden`.

## [v2.28.0] — 2026-06-13
### Added
- **Navigation Progress Indicator**: Added a global YouTube/GitHub-style `NavigationProgress` bar at the top of the viewport on route transitions.
- **Custom Loading Skeletons**: Created custom `loading.tsx` skeletons and reusable `SkeletonPulse` primitives for all major sections: Feed, Profile, Notifications, Prayer Wall, Quiz, and StewardShop.
- **Bottom Dock & Header Navigation Feedback**: Added optimistic active state highlighting and tap animations to bottom dock and unified header menu links to ensure immediate tactile response on slow 5G connections.
- **Service Worker Route Caching**: Configured service worker to use stale-while-revalidate caching for known app shell routes (`/feed`, `/prayer`, `/stewardshop`, `/me`, `/quiz`, `/events`, `/notifications`), enabling near-instant app shell loading.

## [v2.27.4] — 2026-06-13
### Fixed
- **Fixed Feed Carousel Height Layout Shifts**: Enforced a fixed height of `220px` on the dashboard `HeroCarousel` container, aligned slide content vertically using flexbox, and added CSS line-clamping (`-webkit-line-clamp: 2`) on event titles/locations and prayer spotlight requests. This completely resolves Cumulative Layout Shift (CLS) layout jumps when the carousel auto-advances.
- **Matched Feed Loading Skeleton**: Updated the loading placeholder skeleton in `/app/(app)/feed/loading.tsx` to match the exact `220px` fixed height, `12px` border-radius, and `1rem` margin wrapper of the real carousel to ensure a seamless initial page load transition.

## [v2.27.3] — 2026-06-13
### Fixed
- **Restored Branded Sender IDs**: Removed the temporary `MASKPRO` override and restored the default dynamic branded Sender ID routing (e.g. `HGF Connect` for OTPs, `HGF Church` for general alerts), confirming that all five branded masks are fully registered, approved, and delivering successfully.

## [v2.27.2] — 2026-06-13
### Fixed
- **Approved Sender ID Configuration**: Added support for overriding the default Sender ID using the `ITEXMO_SENDER_ID` environment variable for flexible environment overrides.

## [v2.27.1] — 2026-06-13
### Fixed
- **Instant OTP Transmission**: Refactored the SMS recovery path to use the direct synchronous `sendSms` helper, eliminating the delay from the background batch queuing cron job.
- **Production SMS Credentials**: Resolved missing Itexmo environment variables and the internal API key on the production droplet's `.env.production` file and reloaded PM2.

## [v2.27.0] — 2026-06-13
### Added
- **Multi-Channel Account Recovery Routing**: Implemented conditional prioritized routing for AI account recovery OTP verification. SMS (via Itexmo provider) is prioritized if a mobile number is present. If no mobile number is found, it falls back to Email OTP verification (via Nodemailer). If neither is present, verification is bypassed to allow direct profile recovery.
- **Adjustable OTP Validity Duration**: Increased the OTP waiting/validity period from 10 minutes to **30 minutes** to accommodate carrier delivery delays.
- **Email OTP Provider**: Created a unified SMTP email dispatch utility in `lib/email.ts` using Nodemailer, with support for development mode console logs fallback.

## [v2.26.5] — 2026-06-13
### Added
- **Pastors & Admins Answer Reveal**: Configured `api/quiz/status` to conditionally fetch and expose correct answers ONLY to administrators and active pastoral staff. Added a secure green panel inside the completed challenge information modal in the frontend that reveals the correct draggable verse sequence for SCRIPTURE_ORDERING (Verse Builder) challenges.

## [v2.26.4] — 2026-06-13
### Added
- **Local OCR Fallback for Flattened Slide Decks**: Configured `presentationProcessor.ts` to automatically detect flattened slide presentations containing no native text layers (e.g. rasterized PDF/PPTX). Added local OCR processing via Tesseract.js to extract text from slide image frames on the server, ensuring accurate AI spiritual takeaways and commentaries are generated without requiring vision APIs.

## [v2.26.3] — 2026-06-13
### Added
- **Fullscreen Lightbox Slide Navigation**: Enhanced the maximized image viewer (`ImageLightbox.tsx`) to support slide deck exploration directly in full view. Added centered left/right arrow navigation controls, swipe gestures for touch devices, keyboard arrow triggers (`ArrowLeft` / `ArrowRight`), and a slide count header.
- **Synchronized Active Slide Indices**: Bound `MemberQuizPage` and `ResourcesClient` carousel state updates to lightbox slide changes so current slide states are retained when toggled.

## [v2.26.2] — 2026-06-13
### Fixed
- **Double Path Prefix for Slide Source**: Modified `ResourcesClient.tsx` and `quiz/page.tsx` slide image elements to check if paths already start with a slash prefix (e.g. `/uploads/presentations/slides/`) before interpolating, preventing broken image indicators.
- **Quiz Admin Rewards Drawer UI**: Refined "View Rewards" button in Quiz Admin to toggle open/closed, show a loading status, and display an explicit empty state fallback message when no rewards have been claimed yet.

## [v2.26.1] — 2026-06-13
### Fixed
- **Admin Dashboard Safe Area Notch Alignment**: Added safe-area-inset-top padding to the admin main scroll container (`app/admin/layout.tsx`) and the sidebar navigation container (`components/layout/AdminSidebar.tsx`) to prevent status bar cutoffs and ensure all dashboard elements, menu items, and sidebar toggles are fully visible and clickable on iPhone devices.

## [v2.26.0] — 2026-06-13
### Added
- **Sermon Slides & AI Commentary Integration**: Integrated text extraction via `pdf-parse` and automated sermon commentary generation via Straico AI (`gpt-4o-mini`). Slide optimization transforms decks into progressive WebP slides and outputs a Markdown spiritual takeaway summary.
- **Tabbed Member Quiz Study Guide**: Implemented tabs on the Quiz page (`📺 Livestream Replay` and `📽️ Sermon Slides`) showing the sermon's AI reflection summary, a 16:9 widescreen slide carousel, thumbnail strip, lightbox zoom, and deck downloads.
- **Searchable Quiz Admin Event Linker**: Replaced the static latest-sunday card with a searchable select dropdown in the Quiz Admin page. Admins can search and select past events showing slide counts to link to the week's quiz.
- **Sermon Resources Directory**: Created a public `/resources` page listing all past sermons containing presentation slide files, complete with search filtering and carousel previews.

## [v2.25.0] — 2026-06-11
### Added
- **SMS Centralization & Proxy Integration**: Centralized all SMS sending credentials and broadcast APIs from the legacy PHP app (`app.houseofgrace.ph`) to the Next.js Connect app (`connect.houseofgrace.ph`).
- **Internal SMS Proxy Endpoint**: Added a secure proxy route `/api/sms/send-internal` protected by `INTERNAL_API_KEY` to accept forwarded SMS requests from the legacy PHP application.
- **SMS Batch Processing Endpoint**: Added route `/api/sms/batches/process` to query and process pending custom SMS batches using the unified Itexmo helper, updating statistics and logs in the database.
- **Node.js Cron CLI Triggers**: Created `scripts/send-reminders-cron.mjs` and `scripts/process-sms-batches-cron.mjs` to fetch and execute scheduled reminder events and batch processor actions on the server.
### Changed
- **Legacy PHP App Redirection**: Modified legacy PHP helper `utils/sms.php` to proxy all direct SMS requests to the Next.js internal API via cURL, and updated `config/sms.php` to use proxy credentials and disable the legacy `SMS_NOTICE_TEXT` disclaimer footer.

## [v2.24.33] — 2026-06-11
### Fixed
- **StewardShop Sharing OG Images**: Added an on-the-fly image conversion endpoint (`app/api/marketplace/image/[filename]/route.ts`) to convert WebP upload images to JPEG format for social media crawler requests.
- **Open Graph Metadata**: Added missing `og:url` property and specified image type/dimensions (`image/jpeg`, `1200` width) in listing details metadata generation (`app/(public)/stewardshop/[id]/page.tsx`) to resolve Meta/Facebook Sharing Debugger warnings and fix missing link preview images.

## [v2.24.32] — 2026-06-11
### Added
- **Feed Auto-Refresh & Floating Indicator**: Implemented a hybrid auto-refresh system for the community feed. Silent background polling check runs every 20 seconds; if new posts are found, a floating slide-down pill (`"✨ New Posts Available"`) displays if the user is scrolled down ($>180\text{px}$). Clicking the pill scrolls the viewport to the top and reloads the feed. If the user is already near the top ($<180\text{px}$) or manually scrolls back to the top, the feed automatically refreshes cleanly in the background.

## [v2.24.31] — 2026-06-11
### Fixed
- **Header Display Name Truncation**: Redefined user name extraction to display only the first word of the user's first name in the header button (e.g. showing "Shalom" for "Shalom Love Joy E."). Refined style constraints (`maxWidth: 70`, `flexShrink: 1`) on the display name tag to prevent layout wrapping or overlapping on small viewports.
- **Dynamic Event Feed Updates**: Implemented dynamic event detail backfilling inside GET `/api/posts`. Intercepts event posts (`EVENT` type) containing `[event:id]`, queries the database for the latest event parameters, and replaces the post title, dates, times, description, and cover photo dynamically, ensuring feed announcements stay in sync with event edits.

## [v2.24.30] — 2026-06-11
### Fixed
- **Quiz Active Week Progression**: Resolved quiz week completion blocking logic. The active weekly quiz card now remains in `"🔥 ACTIVE WEEKLY QUIZ"` state throughout the sermon week (rather than immediately completing on first submission). Enabled `"Continue Playing"` and `"View Quiz Progress"` buttons linking to the active game page, letting users catch up or play new daily drip challenges.
- **Quiz Play Gating**: Fixed the `isPastQuizView` flag which blocked playing the active quiz when accessed directly via the Brand Hub link (which passes the `quizId` parameter).
- **Quiz Brand Hub Banner Positioning**: Positioned the cover photo banner background offset to `center 60%` to place the young people and mobile phones vertically centered.

## [v2.24.29] — 2026-06-11
### Fixed
- **Event Timezone and Offset Shifts**: Standardized event time parsing on the server with UTC indicators (`Z`) and event formatting in clients with `timeZone: "UTC"`, eliminating 8-hour timezone shifts in the Admin Dashboard event creation/editing modal.
- **Multimedia Dashboard Countdown**: Locked target date countdown evaluations strictly to Manila Time (`+08:00` offset) to prevent clients outside UTC+8 from displaying wrong timer intervals.

## [v2.24.28] — 2026-06-11
### Added
- **NTC & Itexmo Sender ID Approvals**: Official approval received from NTC and Itexmo for five branded Sender IDs: `HGF Connect`, `HGF Church`, `HGF Care`, `HGFMinistry`, and `HGF Youth`.
- **Sender ID Testing Suite**: Created a temporary PHP testing script (`scratch/test_itexmo.php`) to test SMS deliveries using the approved Sender IDs.

## [v2.24.27] — 2026-06-11
### Fixed
- **Monthly Birthday Catch-Up Logic**: Replaced the fragile `currentDay === 1` gate on the monthly birthday announcement with a resilient catch-up check. The cron now checks every day whether a `BIRTHDAY_MONTHLY` post exists for the current month (by matching the month name in the JSON content and `createdAt >= start of month`). If none exists, it creates one immediately. This ensures the monthly celebrants post is never missed due to server downtime, reboots, or cron failures on the 1st of the month.

## [v2.24.26] — 2026-06-10
### Changed
- **StewardShop Pretty Links**: Removed the numeric listing ID suffix from the direct share links (e.g. `https://hgfapp.link/s/rockford-mixer` instead of `https://hgfapp.link/s/rockford-mixer-21`).
- **Dynamic Slug Redirection Routing**: Updated the `/s/[code]` redirection route to resolve pretty slugs dynamically by searching active listing titles when no numeric ID or referral coupon matches the code.

## [v2.24.25] — 2026-06-10
### Added
- **StewardShop Pretty Short Links**: Updated the owner's direct listing share link to use the short `hgfapp.link/s/{pretty-slug}-{id}` format instead of the long full URL.
- **Short link redirection helper**: Refactored the `/s/[code]` redirection route (`app/s/[code]/route.ts`) to parse pretty slugs and numeric listing IDs to redirect users directly to listing detail pages, while preserving referral link coupon checking.

### Changed
- **StewardShop Analytics IP Display**: Reverted IP masking (removed `xxx` obscuring) in the listing analytics real-time viewer log to display actual, raw IP addresses.

## [v2.24.24] — 2026-06-10
### Added
- **StewardShop Listing Analytics**: Introduced real-time viewer analytics for listing owners, accessible by clicking on the view count/eye icon on both the listing detail page and my-listings dashboard. Displays total views, unique vs repeat viewers, geographic city/country breakdowns with progress bars, and real-time masked IP logs with device parsing.

## [v2.24.23] — 2026-06-10
### Fixed
- **StewardShop Link Preview Image**: Hardcoded the production URL as baseUrl in listing details metadata generation (`app/(public)/stewardshop/[id]/page.tsx`) to prevent `NEXT_PUBLIC_APP_URL` from baking `http://localhost:3000` during local builds.

## [v2.24.22] — 2026-06-10
### Changed
- **Quiz Hub Layout**: Extended the cover banner height to 240px and adjusted background positioning to "center 20%" so faces are visible.
- **Weekly Quiz Visibility**: Added a prominent, highly obvious, and compelling active weekly quiz card above the navigation tabs on the hub page, allowing users to play immediately.

## [v2.24.21] — 2026-06-10
### Added
- **StewardShop N/A Condition**: Added "N/A" listing condition. Automatically set condition to "N/A" and hide the condition selector/badge for "Services" categories/types.
- **StewardShop Facebook Video Integration**: Support pasting Facebook video/reel links and rendering them as the first slide in a Shopee/Lazada-style carousel on the detail view.
- **StewardShop SEO/OG Metadata**: Created custom Filipino/ASEAN shaking hands fallback OG image (`/stewardshop_default_og.png`) and updated listing details SEO metadata with automatic video-token stripping.
- **StewardShop Owner Self-Sharing**: Display a generic, clean share panel for listing owners to copy and share their listings without referral codes.

## [v2.24.20] — 2026-06-10
### Changed
- **Password Change Requirements**: Removed the current password verification requirement both on the client UI and the API route `/api/profile/password`. Members can now change their passwords directly by entering their new password.

## [v2.24.19] — 2026-06-10
### Changed
- **Profile Edit Tabs Order**: Moved the Security tab next to the Bio & Verse tab for a more logical navigation hierarchy.

## [v2.24.18] — 2026-06-10
### Changed
- **Profile Edit Security Separation**: Separated the username update form and password update form in the profile edit security tab, adding an independent "Update Username" button so they can be changed without password prompt or validation issues.

## [v2.24.17] — 2026-06-10
### Changed
- **Church/System Notification Authors**: Changed notification titles for system-wide posts (quizzes, events, birthdays) to use "House of Grace Fellowship" or "HGF Quiz For Christ" instead of the administrator's personal name. Backfilled all existing event notifications in the production database.

## [v2.24.16] — 2026-06-10
### Changed
- **Dynamic Birthday Posts & Celebrants**: Replaced static JSON payload reading in daily/monthly birthday post feed cards. The system now extracts member IDs from the JSON post content, queries current database values, and updates name and photo paths dynamically on the fly to prevent stale data.

## [v2.24.15] — 2026-06-10
### Changed
- **Profile Edit Wording**: Removed the placeholder text `"Karen Joan, Kyrah Grace, Kyan Zach"` from the Family Members input field on the profile edit page to prevent prewritten names from displaying as a placeholder.

## [v2.24.14] — 2026-06-10
### Changed
- **Wording Update**: Changed dropdown menu item "My Journal" to "My Grace Blog" with the `📝` emoji in `UnifiedHeader.tsx`.
- **Prayer Request Redirection**: Linked the "My Prayer Requests" menu item on the profile page (`app/(app)/me/page.tsx`) to `/prayer?mine=true` to guarantee it only displays the logged-in member's personal prayer requests instead of the public Prayer Wall.

## [v2.24.13] — 2026-06-10
### Added
- **Thoughts Photo Uploads**: Enabled photo upload capability (up to 21 images) on the Thoughts tab of the feed creation page, making it fully uniform with the Testimony and Prayer tabs.
- **Mutual Exclusivity logic**: Integrated mutual exclusivity between colored backgrounds and photo uploads (photo upload box is hidden when a colored background is active, and background options button is hidden when photos are present).

## [v2.24.12] — 2026-06-10
### Fixed
- **Mobile Reactions Modal Obscurity**: Applied the `hgf-modal-open` class toggle rule to the Reactions Analytics modal inside `PostCard.tsx` and `PhotoPostViewer.tsx` to automatically hide the `BottomDock` on mobile viewports while the reactions modal is open, preventing its content from being obscured.

## [v2.24.11] — 2026-06-10
### Added
- **Username Editing**: Added username configuration in the Security tab of the Edit Profile page.
- **Debounced Live Validation**: Implemented a 1.5-second debounced JS check to verify if a username is available with format and length constraints.
- **Security Check API**: Added `/api/members/check-username` to verify username uniqueness on the fly.
- **Impersonation Support**: Restored admin impersonation capabilities and the top banner allowing admins to log in as other members.

## [v2.24.10] — 2026-06-10
### Added
- **All Active Members Loaded**: Removed email requirements from the User Roles page to display all active members (including those without an email).
- **Expanded Search**: Allowed searching user roles by first name, last name, email, username, and phone number.
- **Database Role Mapping**: Mapped the database role `user` to the display value `Member` and added support for the `multimedia` role.

## [v2.24.9] — 2026-06-10
### Changed
- **Increased Event Feed Card Height**: Heightened the event cards minimum height inside `PostCard.tsx` to `290px` to successfully expand the background cover image visibility on the feed.

## [v2.24.8] — 2026-06-10
### Changed
- **Taller Event Feed Cards**: Increased the minimum height of the event link cards in `PostCard` to `210px` and applied flexbox spacing to improve cover photo background visibility.
- **12-Hour Time Format**: Configured event creation and dynamic client-side rendering in `PostCard` to format and display start and end times in standard 12-hour AM/PM format instead of military/24-hour format.

## [v2.24.7] — 2026-06-10
### Changed
- **Midweek and Special Services Support on Multimedia Board**: Adjusted the pre-service dashboard event search queries to fetch the nearest active/upcoming event of any type (including midweek Grace Night or special services) rather than strictly filtering for Sunday Services.
- **Service-Wide Default Checklists**: Updated the event creation API to automatically populate default pre-service checklists for all standard service event types (Sunday Service, Grace Night, Special Event, Bible Study, and Prayer Meeting).
- **Generic Dashboard Terminology**: Modified the add-task and default templates checklist modals on the client dashboard to refer to general "Services" rather than strictly "Sunday Services".
### Fixed
- **Grace Night Backfill**: Manually backfilled the default pre-service checklist tasks for the active Grace Night event (ID 66) on the production database.

## [v2.24.6] — 2026-06-10
### Fixed
- **Mobile Long Press Touch Selection**: Added `userSelect: "none"`, `WebkitUserSelect: "none"`, and `WebkitTouchCallout: "none"` CSS styles to the reactions block container, popup popovers, emoji buttons, and main trigger buttons in both `PostCard` and `PhotoPostViewer` to prevent browsers from triggering text selection handles or the copy magnifier context menu when holding down to react.

## [v2.24.5] — 2026-06-10
### Added
- **Async Sermon Presentations in AddEventModal**: Integrated background async PDF/PPTX upload functionality and file optimization polling to the shortcut `AddEventModal` form, matching the core events admin panel features. Includes drag-and-drop support, progress reporting, and state management.

## [v2.24.4] — 2026-06-10
### Fixed
- **Reactions Modal Summary Icon**: Replaced the hardcoded thumbs-up emoji (`👍`) in the "ALL" reactions summary tab with the clean label `"All"` in both `PostCard` and `PhotoPostViewer` to match the global removal of the like reaction.

## [v2.24.3] — 2026-06-10
### Added
- **Event Uploads Drag & Drop**: Implemented HTML5 Drag & Drop file upload support with visual state overlays in `AdminEventsClient` and `AddEventModal`. Administrators can now drag-and-drop cover photos (images) and sermon presentations (PDF/PPTX) directly onto the upload buttons to initiate processing.
- **Event Speaker Input**: Added a new `speaker` field to the `Event` schema and forms. Administrators can now input a speaker's name when creating or editing events.
- **Event Details Speaker Display**: Replaced the "Organized by" label with "Speaker" (with a fallback to the event creator's name) on the public event details page.
### Fixed
- **Dynamic Service Status Display**: Replaced the hardcoded "ACTIVE SERVICE" card badge with dynamic status rendering: "🟢 Active Service (Today)", "📅 Upcoming Service", or "📅 Past Service" based on actual event dates.
- **Robust Manila Timezone Boundaries**: Adjusted server-side date comparison in the multimedia dashboard to use the Asia/Manila timezone midnight boundary, preventing server UTC offsets from causing incorrect "Active" labels on Monday morning.
- **Replaced Native Dialogs with ConfirmModal**: Swapped out native browser `confirm()` and `alert()` popups inside `MultimediaDashboardClient` with the custom `ConfirmModal` component to guarantee layout compatibility on mobile/PWA interfaces.
- **Large File Uploads Support (413 Payload Too Large Fix)**: Configured Nginx proxy limits (`client_max_body_size 500M;`) on the production server to allow uploading large PDF and PPTX sermon presentations (up to 500MB) without triggering entity size rejections.

## [v2.24.2] — 2026-06-10
### Changed
- **Reactions Styling and Labels Layout**: Shifted the overlapping reactions summary bubble to the right-hand side. Removed the text word labels ("Heart", "Pray", "Hug", "Like") from the reactions toggle buttons, displaying only the emoji icon.
### Fixed
- **Clean Member Profile Redirections**: Configured member profile links (on author names, avatars, reactions lists, and birthday cards) to use a normal redirect (`window.location.href`) instead of client-side `router.push`. This ensures any active deep-link query parameters (like `?post=ID`) are completely discarded when transitioning to a member's profile page.

## [v2.24.1] — 2026-06-10
### Fixed
- **Comments Auto-Open Deep-link Fix**: Prevented the comments drawer/popup from automatically opening when clicking deep links (like notifications or Messenger shares). Clicking deep links will scroll the post card smoothly into view but keep the comment drawer closed until manually opened.
- **Multimedia Role Type Declaration**: Added `"multimedia"` role type to `User` and `JWT` interface schemas in `types/next-auth.d.ts` to align with the database schema definitions and fix typescript build errors.

## [v2.24.0] — 2026-06-10
### Added
- **Multimedia Admin Workflow**: Introduced a dedicated `"multimedia"` volunteer role with scoped access restricted to the new Multimedia Dashboard (`/admin/multimedia`). Added middleware guards and layout redirects to enforce role boundaries.
- **Pre-Service SOP Checklist**: Implemented a real-time checklist featuring 8 default pre-service tasks (projector setup, wireless mics battery checks, audio signal routing, video input feeds, countdowns, lyrics sync, rehearsals) that records completing volunteer initials and Manila timestamps.
- **Automated Presentation Compressor**: Integrated background slide processing for uploaded `.pptx` and `.pdf` files. Converts PPTX to PDF via headless LibreOffice, extracts slides as progressive JPEGs via `pdftoppm` at 150 DPI, optimizes dimensions (1920x1080) and quality (80%) using `sharp`, and compiles them into a highly compressed widescreen 16:9 `.pptx` slide deck (slides containing only the compressed JPEGs via `pptxgenjs`), purging massive original uploads immediately.
- **Device-Detected Background Toast**: Built a global `UploadContext` progress tracker. When a presentation is uploaded, it continues processing asynchronously in the background. A floating glassmorphic toast displays progress status and warns the user based on their detected hardware (e.g., "Please do not turn off your laptop/desktop/mobile phone/tablet").
- **MXU-Inspired Dashboard Widgets**: Expanded the dashboard to include a live countdown timer to service, visual slide preview carousels, and an input/output patch sheet reference helper for quick volunteer troubleshooting.

## [v2.23.0] — 2026-06-10
### Added
- **Facebook-like Reactions**: Implemented gesture-triggered reactions (`Heart` ❤️, `Pray` 🙏, `Hugs` 🤗) across all community posts, thoughts, prayers, and member profile photos/cover photos. Hover on desktop or long-press on mobile on the like button will display a floating panel to choose a reaction type. Single click toggles `HEART`.
- **Reaction Summary & Analytics**: Added a Facebook-style overlapping bubble counts summary showing the active types of reactions and total reactors. Tapping the counts bubble opens the Reactions Analytics modal sheet listing the reactor names, filterable by reaction type.
- **PhotoPostViewer Reactions**: Extended the fullscreen photo viewer dialog (`PhotoPostViewer.tsx`) to include the exact same reactions summary bubble, hover/long-press reaction menu, and reactions analytics modal.

## [v2.22.48] — 2026-06-10
### Added
- **Interactive Profile Cover Photo**: Updated the member profile page (`ProfileClient.tsx`) to make cover photos clickable. When tapped, it displays the cover photo history (previous uploads, comments, likes) via `PhotoPostViewer`, similar to profile picture functionality. For own profile, it triggers a bottom sheet option to view or choose a new cover photo.
- **Quiz Hub Cover Alignment & Lightbox**: Shifted the Quiz Hub cover photo `backgroundPosition` to `center 85%` to center the visible portion on the bottom action where people play the quiz on mobile phones. Implemented the standard click-to-enlarge `ImageLightbox` on this banner with propagation overrides for child controls.
- **Photo History API Open Access**: Modified the `GET` handler in `/api/members/[id]/photo-history` to allow any authenticated user to retrieve other members' profile or cover photo history while preserving edit and restoration restriction rules for owners.

## [v2.22.47] — 2026-06-10
### Fixed
- **Homepage Open Graph Image**: Updated the custom `metadata` configuration in `app/page.tsx` to explicitly define Open Graph (`og:image`, `og:url`, `og:site_name`) and Twitter Card tags. This ensures that sharing the root domain (`https://connect.houseofgrace.ph/`) resolves complete previews with the custom branded fallback image (`og-default.png`) rather than overriding and stripping it.

## [v2.22.46] — 2026-06-09
### Fixed
- **Image Lightbox Vertical Centering**: Resolved layout alignment bug on mobile browsers where viewed post images were pushed towards the bottom of the viewport instead of centering vertically. Set the image viewport container to absolute positioning with inset coordinates (`position: "absolute", inset: 0`) to bypass flexbox height rendering quirks on mobile engines.

## [v2.22.44] — 2026-06-09
### Fixed
- **Public Post Share Redirection**: Replaced server-side redirection (HTTP 307) with client-side redirection for public post share pages (`/p/[id]`). This prevents bot crawlers (like Facebook) from following redirects to login/authentication-guarded routes, allowing them to successfully retrieve post-specific Open Graph metadata (such as the actual post image) directly at HTTP 200.
- **Image URL Parsing**: Aligned `ogImage` path resolution logic in `/p/[id]` with `PostCard.tsx` rendering to handle uploaded media paths robustly.

## [v2.22.43] — 2026-06-09
### Added
- **Editable Quiz Rewards (s1)**: Modified the Quiz Admin reward management system so administrators/moderators can edit and update existing reward parameters (tier requirement, title, description, and preview image). The backend updates the existing `QuizRewardItem` record and synchronizes changes to the associated community feed announcement post in real-time, eliminating redundant duplicate posts.
- **Moderator Quiz Gating & Access Fix (s2-s3)**: Expanded permission helper `isPastorOrAdmin` across all quiz administration API endpoints (`save`, `generate`, `publish`, `rewards`, `list`, `backfill`, and `latest-sunday`) to explicitly authorize users with the `"moderator"` role. This resolves the issue where moderators like Karen could not load, manage, or view the active quizzes and data.

## [v2.22.42] — 2026-06-09
### Added
- **Sermon Player Double Click/Tap Toggles Fullscreen**: Implemented double-click (desktop) and double-tap (mobile) detection on the custom sermon video player overlay interceptor. Tapping or clicking twice in quick succession (<300ms) will toggle fullscreen mode (or pseudo-fullscreen mode on PWAs/iOS Safari), whilst instantly reverting the asynchronous play/pause toggle event from the first tap to keep playback state uninterrupted.

## [v2.22.41] — 2026-06-09
### Changed
- **OG Default Image**: Replaced generated placeholder logo with a properly branded `og-default.png` (1200×630) using the real HGF cursive logo (`HGF-icon-v1.0.png`) on a navy blue gradient background.
- **Homepage Open Graph Tags**: Updated `app/layout.tsx` to include `og:image`, `og:title`, `og:description`, and `twitter:card` on the site root (`https://connect.houseofgrace.ph`) so sharing the homepage produces a complete, rich link preview card.

## [v2.22.40] — 2026-06-09

### Added
- **Public Post Share Page (`/p/[id]`)**: Created a dedicated public share route that bypasses authentication entirely, serving full Open Graph meta tags (title, description, image, URL, type) to social media crawlers (Facebook, Messenger, Twitter, WhatsApp, etc.). Human users hitting `/p/[id]` are immediately redirected to `/feed?post=ID`. This replaces the unreliable middleware crawler-bypass approach on `/feed?post=ID`.
- **Default OG Image (`/og-default.png`)**: Added a branded 1200×630px Open Graph fallback image used when a post has no attached photo.
### Changed
- **Share URL updated to `/p/[id]`**: The "Share" button on `PostCard` now copies/shares `https://connect.houseofgrace.ph/p/54` instead of `/feed?post=54`, ensuring proper link preview cards with image, title, and description on all platforms.
- **Middleware exclusion**: Added `p/` to the middleware matcher exclusion list so the share page is never intercepted by auth.
### Fixed
- **OG image missing on share cards**: The `/feed?post=ID` URL was being 307-redirected to `/login` for crawlers due to a race condition with the `auth()` wrapper, causing Facebook/Messenger to scrape only the generic site-level OG tags. The new `/p/[id]` route is fully public and crawler-accessible.

## [v2.22.39] — 2026-06-09
### Fixed
- **Image Lightbox Notch & Safe Area Clipping (s1)**: Wrapped the `ImageLightbox` rendering in a React Portal (`createPortal`) targeting `document.body` to prevent the fullscreen container from being clipped/rendered incorrectly inside nested parent lists and containers. Increased top safety margin to `calc(24px + env(safe-area-inset-top, 0px))` to ensure the close button (`✕`) does not overlap or hide behind the mobile PWA/Safari status bar.
- **Quiz Player Overlay Layout Z-Index & Stacking Context (s2)**: Swapped the local container rendering of `QuizPlayer` to a React Portal targeting `document.body`. This forces WebKit/Blink layout engines to draw the game player at the absolute document root, correctly bypassing parent scrolling container stacking contexts (like `-webkit-overflow-scrolling: touch`) and rendering the daily quiz screens entirely on top of the sticky top navigation header and bottom tab nav docks.

## [v2.22.37] — 2026-06-09
### Fixed
- **SSO Attendance App — "SSO initialization failed" Error**: The `sso_tokens` database table was missing from the production server (`hog_fellowship`), causing every click on the "Attendance App" or "Attendance Kiosk" menu links to return a 500 error. Ran a production MySQL migration to create the `sso_tokens` table with the correct schema (`token VARCHAR(255) PK`, `member_id INT`, `expires_at DATETIME`, `created_at DATETIME`), matching the Prisma schema. The SSO bridge (`/api/auth/sso/attendance`) can now generate and store short-lived tokens, and the legacy PHP bridge (`sso.php`) can validate them and start the `ATTENDANCE_SESSION`.
- **Share Order (Content Above URL)**: The Web Share API's `url` parameter is placed *before* the `text` by iOS/Android share sheets, so the link appeared at the top of the shared message. Fixed by embedding the URL at the bottom of the `text` field and omitting the `url` parameter, producing the correct order: post content first, then the link below.

## [v2.22.36] — 2026-06-09

### Fixed
- **Bloated Share URL**: Removed `text: post.content` from the `navigator.share()` call in `PostCard.tsx`. Passing the full post body as the `text` field caused iOS/Android share sheets to concatenate the entire post content with the URL, resulting in an extremely long share string. Now only the `title` and `url` are passed, producing a clean, short shareable link.

## [v2.22.35] — 2026-06-09

### Fixed
- **Quiz Player Overlay Stack Order**: Changed the quiz player overlay `zIndex` from `9000` to `11000` so that it renders completely on top of the main app navigation header (which floats at `zIndex` 9999), preventing status bar cutoff issues.

## [v2.22.34] — 2026-06-09
### Added
- **Post Image Lightbox Viewer**: Integrated a highly interactive zoomable image lightbox component (`ImageLightbox`) allowing users to tap on single post images, quiz rewards, and image arrays in the feed to zoom and pan.
- **Dynamic SEO Open Graph Headers**: Converted `/feed` to a Server Component (`FeedClient` wrapper) to generate dynamic Meta Open Graph tags (dynamic titles, descriptions, and absolute image paths) for shared post URLs like `/feed?post=[id]`.
- **Crawler Redirect Bypass**: Configured `middleware.ts` to allow social media crawler bots (Facebook, Messenger, Google, etc.) to query `/feed?post=[id]` without being redirected to `/login`, enabling link sharing previews.

## [v2.22.33] — 2026-06-09
### Changed
- **Sermon Quiz Generation Date Formatting**: Formatted the sermon date to a human-readable format (e.g., "June 7, 2026") in the AI quiz generator prompts so that generated captions are properly formatted.
### Fixed
- **Quiz Player Mobile Safe Area**: Added top padding of `calc(1rem + env(safe-area-inset-top, 0px))` to the QuizPlayer overlay to prevent status bar or notch overlaps in game pages.

## [v2.22.32] — 2026-06-09
### Added
- **SSO for Attendance App / Kiosk**:
  - Implemented secure single sign-on (SSO) between Next.js (`connect.houseofgrace.ph`) and the legacy PHP system (`app.houseofgrace.ph/attendance/`).
  - Added an `SsoToken` schema table to the database for registering short-lived, single-use credentials.
  - Implemented the Next.js API route `/api/auth/sso/attendance` to generate a token and redirect ushers.
  - Built the `sso.php` bridge script in the legacy PHP codebase to consume the token and start the corresponding `ATTENDANCE_SESSION`.
  - Updated all menu items, drop links, and dashboard action buttons to route through the SSO bridge.
### Fixed
- **Deep Linking for Prayer Notifications**:
  - Changed `PRAYER` post notification targets to deep link directly to `/prayer?highlight=[id]`.
  - Added a custom scrolling and glowing highlight pulsation animation on the targeted prayer card.
- **Mobile Responsive Enhancements**:
  - Prevented "Pray Now" action buttons from wrapping onto multiple lines on small screen widths.
  - Fixed hero carousel quiz titles from truncating by splitting the title and date and displaying them cleanly on separate lines.

## [v2.22.31] — 2026-06-09
### Added
- **Weekly Quiz Reward Announcement System**:
  - Implemented the pastor/admin interface in `app/(app)/quiz/admin/page.tsx` for announcing weekly rewards (e.g. statement t-shirts) linked to the active published quiz.
  - Added file upload component with visual image preview resolving to `/uploads/rewards/` using the Sharp-to-WebP backend processing pipeline.
  - Modified the Member Portal (`app/(app)/quiz/page.tsx`) to show "This Week's Prizes" dynamically and display custom unlocked reward details, titles, descriptions, and uploaded images for completed weeks.
  - Modified `/api/quiz/admin/list` endpoint to include `rewardItems` in the response, rendering announced rewards list under each quiz in the admin table.

## [v2.22.30] — 2026-06-09
### Added
- **Sermon Quiz Late Publication Auto-Backfill**:
  - Automatically backfills daily challenge feed posts (`QUIZ_DAILY`) and member notifications when a quiz week is published late (e.g., on a Tuesday or Wednesday).
  - Backfills all elapsed days from Day 2 (Tuesday) up to the current Manila quiz-relative weekday, while keeping future days locked.
  - Linked the Day 1 (Monday) question's `feedPostId` directly to the main `QUIZ_ANNOUNCEMENT` feed post.
  - Updated the day access check in `/api/quiz/question` and `/api/quiz/submit` to use Manila timezone quiz-relative weekday calculation and check for quiz week expiration, preventing early locking/unlocking discrepancies.

## [v2.22.29] — 2026-06-09
### Added
- **Prayer Request Integration & Deep Linking**:
  - Automatically create a matching database `PrayerRequest` record when submitting a post of type `PRAYER` via the feed creation page.
  - Added a distinct, rounded "🙏 Pray Now" CTA button on the feed `PostCard` for prayer posts, styled in light purple (`#f5f3ff`) to match the prayer wall design guidelines.
  - Clicking "Pray Now" deep-links the user directly to the Prayer Wall (`/prayer?pray=[prayerRequestId]`), which automatically fires the prayer commit form dialog.
  - Added a `GET` endpoint for individual prayer requests (`/api/prayer/[id]`) to dynamically fetch details if a deep-linked prayer request is not present on the first page.
  - Cascaded deletion between prayer posts on the community feed and prayer requests on the wall so deleting either deletes both.

## [v2.22.28] — 2026-06-09
### Fixed
- **AI Rewriter Quote Removal**: Added robust backend and frontend quote stripping filters to remove any surrounding double quotes, single quotes, or curly quote marks from the improved response. Appended formatting instructions to the editor system prompt to explicitly prevent wrapping responses in quotation marks, ensuring clean output across thoughts, testimonies, and prayer requests.

## [v2.22.27] — 2026-06-09
### Changed
- **Admin Dashboard Mobile Responsiveness**: Completed site-wide responsive enhancements across all remaining admin views. Integrated card switcher structures for data tables (StewardShop, Love Gift claims, SMS Logs, User Roles) and flex wrap layouts (Events, Testimonies, Ministries, Send SMS, Birthdays, settings) to ensure optimal usability on mobile displays (< 768px).

## [v2.22.26] — 2026-06-09
### Changed
- **Credentials Sharing Template Wording**: Updated the copied credentials share message template to clearly notify the user that their password was successfully reset, provide the temporary login credentials, and encourage them to change their temporary password and complete their profile details.
- **Admin Sidebar Auto-Collapse**: Added a responsive window-resize listener hook to the Admin Sidebar component (`AdminSidebar.tsx`) to automatically collapse the navigation sidebar to its compact, icon-only layout on mobile displays (viewport width < 768px).

## [v2.22.25] — 2026-06-09
### Added
- **Username Column**: Added a "Username" column in the Admin Members table directory, rendering user usernames in clean code-style badges.
- **Admin Password Reset**: Implemented a "Reset Pass" action under the Actions column allowing authorized ushers/moderators/admins to trigger secure password resets. The generated temporary credentials follow the format `Grace` + 5 random digits (e.g. `Grace12345`) and automatically generate usernames for members lacking one.
- **Temporary Credentials Sharing Modal**: Designed a glassmorphism credentials details dialog featuring single-click clipboard copy with animated success feedback.
- **Mobile Responsive Card Views**:
  - Refactored the Admin Members management view to switch dynamically to a self-contained card stack layout on mobile devices (`max-width: 767px`), packing status/role badges, join date, contact parameters, ministries, username, and all action buttons in a neat, phone-friendly block.
  - Added responsive CSS wrappers to the Pending Registrations review page (`/admin/review`), preventing action buttons from overflowing or squishing on narrower mobile displays.

## [v2.22.24] — 2026-06-09
### Fixed
- **Birthday Cron Job**: Registered the daily birthday auto-announcer script (`scripts/birthday-cron.mjs`) in the server's crontab to run daily at 11:00 PM UTC (7:00 AM Manila Time), resolving the issue where daily birthday greeting posts were not being published to the community feed.

## [v2.22.23] — 2026-06-09
### Fixed
- **Mobile Safe Area Header Notch Overlap**: Added `paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))"` to the `/grace-blog/[id]` details page header style to prevent status bar cutoffs and ensure the back button is fully clickable.

## [v2.22.22] — 2026-06-09
### Changed
- **Thoughts Notification Rename**: Renamed the notification category label from "a reflection" to "a thought" for standard text posts, aligning with the "Thoughts" tab name.
- **Smart Deep Link Redirections**: Configured active post notifications to include a dynamic query parameter link (`/feed?post=ID`), which automatically scrolls the post into view and opens the comments drawer on click.

## [v2.22.21] — 2026-06-09
### Changed
- **Redirect Submit Prayer Request**: Changed the "+ Submit Prayer Request" button on the Prayer Wall (`/prayer`) to redirect to the new unified compose page (`/feed/create?tab=prayer`).
- **Remove Old Prayer Input**: Deleted the redundant old composer page at `app/(app)/prayer/new/page.tsx`.
- **Refine Testimony Tab Instructions**: Simplified the instruction text card under the Testimony composer tab to: "Share what God has done in your life! Feel free to write in Cebuano, Taglish, or English in your own words."
- **Hide Thoughts Reflection Tag**: Removed the "Reflection" tag label from rendering above normal text thoughts posts (`TEXT` type) in the community feed (`PostCard.tsx`).

## [v2.22.20] — 2026-06-09
### Added
- **My Prayer Requests View**: Created a private personal prayer requests tab (`/prayer?mine=true`) accessible via the Avatar dropdown menu. Enabled inline text editing and request deletion (using custom `ConfirmModal`). Added status toggle to mark personal requests as active or answered.
- **Avoid Bottom Dock Obscurity**: Implemented the global body-class rule `body.hgf-modal-open .hgf-bottom-dock { display: none !important; }` to hide the bottom navigation dock when any modal (`PrayCommitModal` or `ConfirmModal`) is open, preventing navigation controls from overlapping on mobile screens.

### Changed
- **Pray Hero Button Redirect**: Redirected the "🙏 Pray" spotlight action button inside the home `HeroCarousel` directly to the `/prayer` wall page.

## [v2.22.19] — 2026-06-09
### Changed
- **Ask for Prayer Shortcut**: Renamed the "Pray" shortcut to "Ask for Prayer" on the feed page and public landing page, and moved it right next to "Events".
- **Prayer Wall Dock Navigation**: Renamed the bottom navigation dock label from "Prayer" to "Prayer Wall".

## [v2.22.18] — 2026-06-09
### Added
- **Multiple Photos in Prayer Requests**: Enabled up to 21 photo attachments for Prayer Requests (aligning with the Testimony tab). Attached photos are uploaded to the post uploads endpoint (`/api/posts/upload`), persisted via the new `PostPhoto` relation schema, and rendered in a clean horizontal scroll list on their card inside the community feed.
- **Admin Testimonies Read Status Toggle**: Added a `readByAnnouncer` Boolean field to the database schema. Rendered a `Mark Read` (green) / `Read` (disabled grey) status button next to "Present" in `/admin/testimonies` dashboard panel, enabling ushers and admins to update and persist whether a testimony was read during the Sunday service.
- **Automated Testimony Translation & Categorization**: Removed manual "Process with AI" button on the client. Testimonies are now automatically parsed, translated, categorized, and tagged in the background on the backend `/api/testimonies` POST handler using Straico (gpt-4o-mini).

### Changed
- **Testimony Editor Refinement**: Renamed "Your Story (Bisaya / English)" to "Your Testimony" on the community feed create page. Enabled the standard "Make it better with AI" options (Cebuano/Taglish/English) to assist in editing styling before posting.
- **Registrations Module Naming Update**: Renamed the registrations sidebar link in the Admin Dashboard from "Registrations" to "Review" to serve as a shorter name for "Review New Registration", located next to the "Members" menu.
- **PWA Bottom Dock Layout Adjustments**: Corrected mobile notch space overlaps in `BottomDock.tsx` by setting the height to `calc(64px + env(safe-area-inset-bottom))`, removing the active page absolute dot indicator, and centering all navigation links.

## [v2.22.17] — 2026-06-09
### Added
- **Usher Admin Permissions**: Expanded the `usher` role permissions to allow access to exactly 7 allowed admin console modules: Members, Registrations (Review), Events, Testimonies, Ministries, StewardShop, and Birthdays.
- **Registrations Module Naming & Placement**: Renamed the "Review" admin page title to "Review New Registration" and modified the admin sidebar navigation to label it "Registrations", repositioning it right next to "Members".
- **Admin Access Control & API Safeguards**: Added server-side role validation checking to block ushers from `/admin/send-sms`, `/admin/sms`, `/admin/church-settings`, and `/admin/users`, while updating API routes (`/api/events/[id]`, `/api/ministries/[id]`, `/api/admin/stewardshop/listings`, `/api/admin/love-gifts`, `/api/members`) to authorize ushers for their permitted actions.

## [v2.22.16] — 2026-06-09
### Added
- **StewardShop L.O.V.E. Acronym Details Card**: Inserted a premium L.O.V.E. definition card explaining Livelihood, Opportunity, Value, and Empowerment on the "Share & Bless" page.
- **Birthday Celebrants Orbit Confetti & Emoji Background**: Integrated CSS falling confetti and floating birthday emojis animating dynamically inside the Orbit circle component (`BirthdayCircle`).
- **Birthday Celebrants Show-More Limiter**: Implemented a responsive collapsable view on the monthly celebrants feed card list. Limits initial display to 7, applying a smooth white/grey gradient overlay down to 10 items, complete with clean "View More" and "Show Less" toggle controls.
- **Chronological Birthday Sorting**: Modified feed parsing (`PostCard.tsx`) and cron triggers to sort the monthly celebrants list chronologically by birthDay (from day 1 to last of birthdays) instead of sorting by member database ID.

### Fixed
- **Quiz Hub Mobile Space Gap**: Resolved the layout bug causing a large white space above the cover photo and incorrect back button displacement on `/quiz/hub` on mobile devices.

## [v2.22.15] — 2026-06-08
### Added
- **Testimonies Submission Consolidation**: Consolidated the dedicated `/testimonies/create` page into the main community write page (`/feed/create?tab=testimony`). Changed the original route `/testimonies/create` to perform a server-side redirect to the unified feed compose tab.
- **Multiple Photo Testimony Uploads**: Added the optional multiple photo upload grid to the Testimony tab on the write/create page. It supports up to a maximum limit of 21 photos, with automatic selection bounds and file slicing.
- **Dedicated Testimony AI Processor**: Integrated the original Bisaya/English translation and tag analysis AI helper to the Testimony tab.

## [v2.22.14] — 2026-06-08
### Added
- **AI Account Recovery Chatbot (`/login/ai-help`)**: Re-engineered the account recovery page from a static wizard form into an interactive conversational chatbot (Grace AI Helper). Integrated simulated typing indicators, chat bubble history, context-aware input elements, multiple account selection cards, and OTP verification directly inline.
- **Forgot Password Link Centering**: Center-aligned the "Forgot password? Ask AI for help..." recovery link on the login page (`app/(public)/login/page.tsx`) to ensure wrapped lines center correctly.

## [v2.22.13] — 2026-06-08
### Added
- **StewardShop Private/Moderated Dashboard Indicators (s4)**: Added visual `PRIVATE` status badges and warning boxes showing the exact moderation reason on the seller's "My Listings" dashboard (`/stewardshop/my-listings`), ensuring users can easily identify flagged/private listings and take action.
- **StewardShop Moderation Notifications (s1-s2)**: Integrated database notification dispatching when a listing is moderated (flagged private or restored to public) or a seller's verification badge status is toggled, sending alert messages directly to the member's notification bell.
- **Event Creation Broadcast Notifications (s3)**: Added event broadcast logic to the event creation API endpoint (`/api/events`), sending a system-wide notification to all active church members' bells when a new official event is scheduled.

## [v2.22.12] — 2026-06-08
### Added
- **AI Account Recovery (`/login/ai-help`)**: Implemented step-by-step account recovery flow using first name, last name, birthdate, and optional mobile number. Generates high-priority SMS OTP, resets password to `"Godisgood"`, and transactionally merges duplicate accounts (moving posts, likes, comments, group memberships, and other data) without deleting user contributions.
- **StewardShop Admin Moderation**: Created a listing moderation dashboard at `/admin/stewardshop` allowing admins/pastors to flag inappropriate listings, toggle private mode, add custom moderation reason tags, and manage member verification badges directly.
- **Sermon Quiz Date Corrections & Backfill**: Database backfill shifting the weekly sermon quiz dates and system posts from May 31, 2026, to May 17, 2026.

## [v2.22.11] — 2026-06-08
### Changed
- **Landing Page Features (s1-s3)**: Aligned the "What's in the App" list items (icons, labels, and order) on the public landing page (`app/page.tsx`) with the updated `/feed` shortcuts. Added `StewardShop` with the handshake (`🤝`) icon and ordered sections correctly.
- **Birthday Control Button Label (s5)**: Renamed the manual trigger buttons in the Birthday Control Board (`BirthdayAdminClient.tsx`) from "Post Demo" to "Post to Feed" to make it clearer for administrators publishing greetings.

## [v2.22.10] — 2026-06-08
### Added
- **Official Church Page (/church)**: Created a Facebook Business-style organization hub for "House of Grace Fellowship" under `/church` featuring three tabs:
  - Wall: Displays official church events and daily/monthly birthday system posts (fetched via `?church=true` filter).
  - Birthdays: Embeds the monthly birthday orbit circle selector and member listings.
  - Events: Lists upcoming events and past events with search/type filters and pagination.

### Changed
- **Unified Redirects to Church Page**: Modified feed item click routing for `EVENT` posts, monthly birthdays, and daily birthdays to link to `/church` instead of `/birthdays` or member profile pages.

### Fixed
- **Event Post Deletion**: Adjusted delete permissions on `PostCard.tsx` to allow creators, admins, and moderators to delete `EVENT` posts in the community feed.

## [v2.22.9] — 2026-06-08
### Fixed
- **Prayer Placeholder (s1)**: Removed the verbose placeholder example ("E.g. Please pray...") from the textareas in both the main Composer feed (`app/(app)/feed/create/page.tsx`) and the dedicated Prayer Request page (`app/(app)/prayer/new/page.tsx`) to simplify and clean the interface.

## [v2.22.8] — 2026-06-08
### Changed
- **Birthday Circle Center Photo & Bottom Name Banner**: Redesigned the birthday orbit carousel (`BirthdayCircle.tsx`) to show the hovered/tapped celebrant's profile or cover photo framed in the center circle instead of their name, and added a clean name banner capsule below the carousel circles for the active profile name. Height adjusted from 220px to 240px for proper alignment.

## [v2.22.7] — 2026-06-08
### Added
- **Birthdate on Daily Birthday Posts (s1)**: Configured the sub-header metadata for daily birthday posts to show the celebrant's birthdate next to "Happy Birthday" accompanied by a birthday cake emoji (e.g. `· 🎂 June 30`). Deployed backward-compatible fallback parsing the post creation date for older legacy posts.

### Changed
- **StewardShop Branding and Icons (s2)**: Replaced the outdated "Market" label and `🛍️` icon on the Feed page shortcuts list with "StewardShop" and the handshake `🤝` icon to align with the app's bottom navigation bar theme. Renamed "Marketplace" to "StewardShop" with `🤝` icon on public navigation links and the user dashboard page.
- **Shortcuts Layout Order (s3)**: Reordered the scrollable shortcuts bar on the Feed page to place `Events`, `StewardShop`, `Directory`, and `Pray` next to `Write` in that exact sequence, keeping less-frequent shortcuts (`Grace Blog`, `Devo`, and `AI Helper`) at the end.

## [v2.22.6] — 2026-06-08
### Fixed
- **Post Deletion Handler**: Created the backend API endpoint `app/api/posts/[id]/route.ts` to process `DELETE` requests for posts, fixing the issue where clicking "Delete Post" on feed items failed to delete them.

### Changed
- **Demo Cooldown Removal**: Removed the 24-hour duplicate prevention filter from the admin demo trigger API (`/api/admin/birthdays/demo`), allowing immediate re-posting of individual/monthly celebrant greeting announcements for debugging, while keeping success notifications active.

## [v2.22.5] — 2026-06-08
### Added
- **Dedicated Public Birthdays Directory**: Created a public `/birthdays` page showing the animated rotating centerpiece and a structured monthly celebrants list.
- **Clickable Feed Grid & Mini Avatars**: Redesigned the monthly birthday post celebrants grid so each member is clickable (navigating to their profile wall), and displays their customized mini avatar (with coverPhoto fallback) and birth date.
- **Double Posting Prevention**: Implemented a 24-hour database cooldown check for both monthly and daily birthday demo posts to prevent accidental spamming from the control board.

### Changed
- **System Post Attribution**: Added birthday post types to `SYSTEM_POST_TYPES` to prevent them from showing up on the admin's personal profile wall.
- **System Redirect**: Configured system post headers ("House of Grace Fellowship") to redirect clicks to `/birthdays` instead of the administrator's personal profile.
- **Warm Greeting Wordings**: Updated birthday greeting templates to remove the clunky "brother/sister in Christ" phrasing, replacing it with a warmer "our dear [Name]" format.

## [v2.22.4] — 2026-06-08
### Added
- **Premium Monthly Celebrants Feed Layout**: Redesigned the monthly feed post to display a warm celebration caption, an HGF monthly encouragement verse, the rotating CSS-animated orbit circle, a structured list grid of celebrants displaying their names and specific birth dates, and a signature sign-off.
- **Image Fallback Strategy**: Configured the birthday layout to fall back to `coverPhoto` if a member has no `profilePicture` set, resolving the placeholder issue for members with missing profile photos.

## [v2.22.3] — 2026-06-08
### Added
- **Birthday Preview Dashboard**: Created `/admin/birthdays` page for admins, moderators, and ushers to preview upcoming daily and monthly birthday posts in advance.
- **Usher Access Control**: Restricted `usher` role users in `/admin` to only access the Birthdays preview page (automatically hiding other tabs and redirecting from the dashboard index).
- **Manual Demo Post Actions**: Added "Post Monthly Celebrants Now" and "Post Daily Greeting Now (Demo)" triggers, integrated with `/api/admin/birthdays/demo` to publish live birthday posts to the feed immediately.

## [v2.22.2] — 2026-06-08
### Added
- **Automated Birthday System**: Implemented automated monthly birthday circle announcements featuring rotating animated profile pictures, and daily personalized birthday greeting feed posts with Encouraging Scripture cards and warm greetings.
- **Birthday Check API & Cron**: Added `/api/birthdays/check` endpoint and daily schedule cron runner script (`scripts/birthday-cron.mjs`) executing at 7:00 AM Manila Time.

### Changed
- **Quiz Hub Header UI Layout**: Refactored Quiz Hub header (`app/(app)/quiz/hub/page.tsx`) to move title, subtitle, and brain logo avatar out of the cover banner onto a clean white background with the logo overlapping the bottom of the cover banner.

## [v2.22.1] — 2026-06-08
### Added
- **Quiz Cover Banner**: Added a high-quality photographic cover photo showing church members engaging with the mobile quiz app together, replacing the solid gradient header on the Quiz Hub page.

### Changed
- **Completed Day Modal UX**: Upgraded daily quiz completion popups to a premium layout, replacing raw text strings with styled React elements showing color-coded score status and AI feedback blocks.
- **Friendly Empty States & Error Modals**: Replaced generic robotic "Quiz is not active" error alert popups with encouraging, detailed instructions pointing users to the Quiz Hub.

### Fixed
- **Past Quizzes Score & Tier Display**: Fixed an issue where the past quizzes list on the Quiz Hub showed missing tiers ("Tier: ") and 0/7 scores for users without explicit QuizReward records. The backend history API now dynamically calculates scores and tiers based on correct submissions.
- **Info Alert Modal Buttons**: Removed the redundant and confusing "Cancel" button from informative dialogs on the quiz portal.

## [v2.22.0] — 2026-06-08
### Added
- **Quiz Auto-Archival System**: Added automatic lifecycle management for Quiz for Christ. Quizzes now transition from `published` to `completed` automatically when their week ends (Sunday 23:59:59 Manila time). The cron script (`quiz-cron.mjs`) calls a new `/api/quiz/auto-complete` endpoint before each daily post trigger.
- **Expired Week UI State**: When a quiz week has ended, the quiz page shows a "COMPLETED WEEK" badge (muted gray), an informational banner explaining the week is over, and "Missed" labels on unplayed days.
### Fixed
- **Day Access Regression Bug**: Fixed a critical bug where quiz day statuses used the current weekday (`getDayNumber()`) instead of calculating the day relative to the quiz's actual sermon date. This caused all days 2–7 to re-lock on the Monday after the quiz week ended, preventing any catch-up. The new `getQuizDayForDate()` utility calculates the correct day number based on elapsed days since the sermon date.
- **Quiz Stays Active Indefinitely**: Quizzes no longer show "ACTIVE QUIZ WEEK" after their week has ended. The status API now includes `isExpired` and `quizWeekStatus` flags for the client.
### Changed
- **Bell Icon Style**: Replaced the 3D gold bell emoji in the notification header with a flat-white SVG bell icon to match the unified header styling.
- **Stale Quiz Archived**: Manually transitioned the May 31, 2026 quiz ("Planted, Rooted, and Multiply") from `published` to `completed` in the production database since its week ended on June 7.

## [v2.21.7] — 2026-06-06
### Added
- **Styled Text Post Backgrounds (s2)**: Added Facebook-style styled text post backgrounds (Teal, Red, Mountain, Ocean). Users can toggle background themes in the post composer to center their text and display it using large, bold white typography.
- **Composer Emoji Picker (s2)**: Added an inline emoji panel to the composer allowing quick insertion of popular church/general emojis at the cursor position.
- **Scripture Sub-type Selectors (s2)**: Added category pills (Devotional, Bible Verse, Reflection) under the Thoughts tab that dynamically reveal scripture reference and verse text inputs.
### Changed
- **Streamlined Composer Navigation (s2)**: Consolidated the top post type selectors into three main tabs: Thoughts, Testimony, and Prayer.
### Fixed
- **Dropdown Menu Clipping (s1)**: Changed the main PostCard container's overflow from `hidden` to `visible` so absolute options dropdowns overlay outside the card borders on short posts.
- **Link Scraper Preview Retention (s3)**: Configured the composer's URL parser to retain the fetched link preview when the raw URL is manually deleted from the text editor. Previews are dismissed only when explicitly closed or when the text area is fully cleared.

## [v2.21.6] — 2026-06-06
### Fixed
- **Daily Quiz Cron Job Configuration**:
  - Fixed environment loading inside the standalone `quiz-cron.mjs` script by adding a fallback to `.env.production` in production.
  - Added the missing `CRON_SECRET` variable to production environment variables to enable successful authentication against the secure `/api/quiz/daily-post` endpoint.
  - Scheduled the cron task on the UTC server to run at `0 23 * * 1-6` to align with 7:00 AM Manila Time (Tue-Sun), ensuring Sunday's final quiz also gets posted automatically.

## [v2.21.5] — 2026-06-06
### Fixed
- **Profile Wall Loading Crash**: Fixed a database query crash on member profile walls where an invalid post type `QUIZ_WEEK` (which does not exist in the Prisma `PostType` enum) was included in the `notIn` filter. This validation error was causing the `/api/posts` endpoint to return a 500 error, resulting in the page showing "You haven't posted anything yet." for all users. Defining `SYSTEM_POST_TYPES` type-safely as `PostType[]` ensures only valid enums (`QUIZ_DAILY`, `QUIZ_ANNOUNCEMENT`, `EVENT`) are filtered, restoring the display of users' original posts (reflections, testimonies, etc.).

## [v2.21.4] — 2026-06-06
### Fixed
- **Profile Wall Showing System Posts**: Quiz For Christ posts (`QUIZ_DAILY`, `QUIZ_ANNOUNCEMENT`, `QUIZ_WEEK`) and Event posts were appearing on the quiz creator/publisher's personal profile wall because the `authorId` was set to the admin who published them. Added a `notIn` filter to exclude system/community post types from profile wall queries so only personal content (reflections, devotionals, testimonies, etc.) appears on member walls.

## [v2.21.3] — 2026-06-06
### Added
- **AI Assistant Message Timestamp Footnotes**: Added sent/replied timestamp footnotes directly below each message bubble in the AI Chat interface.
- **Enhanced History Button UI**: Upgraded the header clock icon to a premium glassmorphic button with a custom vector SVG icon and a clear "History" label.
- **Empty History State Guidance**: Added informative text within the empty history drawer explaining that active conversation turns are kept for 24 hours on the main screen before rolling over to the past History list.

## [v2.21.2] — 2026-06-06
### Fixed
- **Database Table Creation (`ai_usage`)**: Created the missing `ai_usage` table in the production MySQL database to store daily assistant query usage.
- **BigInt Casting Mismatches**: Wrapped raw MySQL query counts in `Number(...)` on both server routes to prevent BigInt arithmetic exceptions, resolving the `TypeError` crashes that forced both endpoints to fail and return fallbacks.

## [v2.21.1] — 2026-06-06
### Added
- **AI Rewrite Language Selector (s1)**: Implemented an interactive inline choice selector when clicking "Make it better with AI" inside the Testimony post composer. Users can choose to rewrite/polish their testimony in Bisaya, Taglish, or English.
- **AI Assistant Fetch Caching Fix (s2)**: Added dynamic server configuration (`force-dynamic`) and disabled browser/client-side query caching (`cache: "no-store"`) on the `usage-status` and `history` API routes. This resolves a bug where the browser cached initial empty states and failed to reload active conversations.

## [v2.21.0] — 2026-06-06
### Changed
- **Grace Notes to Grace Blog Rebranding**: Renamed "Grace Notes" / "Grace Note" to "Grace Blog" / "Blog Post" across all client pages, settings menus, and editor composers to make the feature's purpose clearer.
- **Grace Notes URL Renaming**: Updated public directory path to `/grace-blog` and detailed reader route to `/grace-blog/[id]`.
- **Dashboard Header Wording Update**: Redesigned the member blog dashboard description to state: "Your private reflection diary and public faith blog — sharing your personal walk of faith with the community." to clearly emphasize the personal blog utility.

## [v2.20.1] — 2026-06-06
### Fixed
- **AI Assistant Quota Reset**: Fixed the daily limit calculations to use the Manila timezone (`Asia/Manila` offset) instead of standard UTC. This prevents limits from resetting prematurely or resetting upon browser refreshes due to timezone date boundary mismatch.
- **Chat Conversation Persistence**: Configured page-load initialization to fetch and load the active conversation from the last 24 hours from the database automatically. This prevents active chat bubbles from resetting on refresh.
- **Chat History Archiving**: Restricted the sidebar history panel list to only return conversations older than 24 hours (archived logs), keeping the active conversation displayed on-screen.

## [v2.20.0] — 2026-06-05
### Added
- **Grace Notes Blog & Rich Text Editor**: Added a WordPress-style contentEditable WYSIWYG editor for writing Grace Notes, supporting formatting styles, links, image URLs, and raw HTML toggle.
- **Grace Notes Public Feeds & SEO Reader**: Built a public directory at `/grace-notes` and article reader at `/grace-notes/[id]` with server-side OpenGraph tags for search engines, supporting private, member-only, and public options.
- **Testimony Composer & AI Rewrite Assistant**: Implemented `✨ Make it better with AI` rewrite helper in the testimony tab to polish Cebuano/Bisaya/Taglish stories without losing the author's native dialect.
- **PWA Auto-Metadata Fetching & Embed Player**: Added link preview parser that fetches OpenGraph headers dynamically. Secure iframe players keep users inside the PWA when playing YouTube, Facebook, and Instagram links.
- **PWA Video Fullscreen Rotation**: Added custom pseudo-fullscreen fallback with 90-degree CSS rotations on mobile portrait viewports to fix iOS maximize bugs.
### Changed
- **Praise Option Renaming**: Renamed "Praise Report" to "Testimony" across all composer tabs, feed tags, notifications, and menus.
- **Modal Dialog Standardization**: Replaced native window `confirm` and `alert` dialogs with stylized `ConfirmModal` overlays to follow app safety guidelines.

## [v2.19.0] — 2026-06-05
### Added
- **Dynamic AI Church Knowledge Settings (s3)**: Added a settings panel at `/admin/church-settings` restricted to admin/moderator roles where leaders can modify basic church info (name, address, service times, prayer schedules, cell groups, volunteering, etc.).
- **Real-time AI Settings Gating (s3)**: Configured `app/api/ai/chat/route.ts` to fetch custom church configurations and upcoming event schedules directly from the MySQL database in real-time.
### Changed
- **Bottom Dock FAB Link & Icon (s1)**: Changed the center dock FAB button from "+Devo" (which pointed to `/devo/new` with `✝️` icon) to "Write" (pointing to `/feed/create` with the writing hand `✍️` icon).
- **AI Helper Icon Swap (s2)**: Replaced the AI Helper / AI Assistant icon from `✝️` (cross) to `💡` (lightbulb) globally across shortcuts, chat headers, suggestion chips, message avatars, and landing page highlights.
- **Shortcut Reordering (s4)**: Reordered the horizontal shortcuts list on the dashboard to place Events, Directory, and Market immediately next to Write.

## [v2.18.3] — 2026-06-05
### Fixed
- **Timezone Offset Bug**: Fixed `getDayNumber()` inside `lib/quiz-helpers.ts` to use `d.toLocaleDateString` for Philippine timezone offset calculations, avoiding fragile string-parsing in different system/node server locales.
- **Active Week "Past Quiz" Lockout**: Updated the status API `/api/quiz/status` to return `isActiveQuiz: boolean`. The client side now checks this flag instead of checking for a search param `quizId`, preventing active week quizzes from showing the locked lockout warning.
- **PWA Header Notch Overlap**: Padded the absolute back button in `app/(app)/quiz/hub/page.tsx` with `env(safe-area-inset-top)` to resolve status bar cutoffs.
### Added
- **Feed Infinite Scroll Auto-Loading**: Replaced the manual "Load More" pagination button with an automated `IntersectionObserver` trigger div at the bottom of the feed page. It fetches the next page automatically when scrolled to, displaying a custom spinner.

## [v2.18.2] — 2026-06-05
### Fixed
- **HeroCarousel Arrow Placement & Mobile Hiding**: Fixed inline style override so navigation arrows are properly hidden on mobile screen widths (where swipe works), resolving text overlapping issues and grouping buttons together.

## [v2.18.1] — 2026-06-05
### Changed
- **HeroCarousel Laptop Navigation**: Added glassmorphic left/right navigation arrow buttons (`‹` / `›`) to the dashboard header carousel, visible on desktop/laptop hover and hidden on mobile touch devices where touch gestures remain active.

## [v2.18.0] — 2026-06-05
### Added
- **In-Place Feed Gameplay**: Embeds `CleanYoutubePlayer` directly in `QUIZ_ANNOUNCEMENT` posts on the community feed instead of static thumbnails. Tapping "Start This Week's Quiz" or "Play Today's Challenge" on feed cards now opens the quiz player overlay directly in-place without page redirection.
- **HTML5 Fullscreen Toggle**: Added native fullscreen enter/exit controls (`⛶` / `🗗`) to the customized youtube player, expanding the study video to fill the screen while keeping custom controls functional.
- **Past Quizzes Hub**: Populated the "Past Quizzes" tab on the Quiz Hub page with clickable past weeks, routing users to `/quiz?quizId=ID` to view historical performance stats.
- **Friendly Progress Badges**: Replaced raw numeric `1/1` and `0/1` challenge checklist scores with positive styled status badges: `🏆 +1 Point` for correct answers and `💡 Learned` for completed incorrect ones.

## [v2.17.1] — 2026-06-05
### Added
- **Visual AI Progress Bar**: Added a simulated loading progress bar and dynamic stage footnotes to the Admin generation panel so admins see exactly what the AI pipeline is doing (formatting, translation, formatting quiz items, structuring explanations).
- **Deep-Linked Feed Challenges**: Added clickable "Play Today's Challenge" CTA buttons on daily quiz feed posts which route directly to the quiz portal and auto-open the corresponding day's challenge.
- **Admin Feed Post Backfill**: Created an admin backfill button and a secure `/api/quiz/admin/backfill` API route to post any past missing daily challenge posts to the community feed.
### Changed
- **Terminology Migration**: Migrated all quiz-related references to "Wallet" to "Points" (e.g. "Weekly Progress & Points") to align with non-monetary spiritual gamification.
### Fixed
- **Player Audio Toggle**: Fixed a casing typo in `CleanYoutubePlayer` mute audio controls where `player.unmute()` failed due to incorrect capitalization. It now correctly calls `unMute()`.

## [v2.17.0] — 2026-06-05
### Added
- **Database-Enforced Sunday Gating**: Updated the `SermonQuiz` schema to make `eventId` required and non-nullable, enforcing that every sermon quiz is strictly associated with a physical Sunday Service event.
- **Auto-linking Validation**: Replaced the manual Sermon Date picker on the Admin creation dashboard with auto-fetching of the most recent physical Sunday Service event. Added strict validations preventing quiz saving or publishing if no Sunday Service event is found.

## [v2.16.1] — 2026-06-04
### Fixed
- **Empty Sermon Date Guidance**: Fixed the Sunday Service gating status box showing a red database warning immediately upon opening the page before the admin has selected a sermon date. It now displays neutral guiding placeholder text.

## [v2.16.0] — 2026-06-04
### Added
- **7-Day Drip Schedule (Monday to Sunday)**: Upgraded the weekly sermon quiz from a 5-day cycle to a full 7-day cycle. Day 1 (Monday) starts immediately on publishing, and Days 2-7 (Tuesday to Sunday) post automatically at 7:00 AM Manila time via cron.
- **Physical Sunday Service Attendance Gating**: Integrated the quiz with the church's unified database. Quizzes now query and automatically link the most recent past Sunday Service event. Members must have an active attendance record for that physical service to join the quiz; otherwise, they are shown a warm, welcoming invitation to gather in person.
- **Locked Embed Player**: Created a custom `CleanYoutubePlayer` using the YouTube Iframe Player API. By disabling pointer events on the iframe and layering a custom play/pause/replay and seek control overlay, we prevent users from clicking outgoing YouTube/external links, keeping them 100% inside the app.
- **Admin Panel Event Link**: Displays the automatically matched physical Sunday Service event for the quiz week and re-added the optional YouTube video URL input.

## [v2.15.0] — 2026-06-04
### Added
- **Two-Phase "Smart Model Switching" Pipeline**: Implemented a systematic cost-saving algorithm for sermon quiz generation.
  - **Phase 1 (Formatting & Translation)**: Uses a low-cost model (`openai/gpt-4o-mini`) to clean up conversational filler words, translate Tagalog/Bisaya segments (~30% of preaching) to English, and produce a structured summary while strictly preserving pastor-specific illustrations, scriptures, names, and key terms.
  - **Phase 2 (Structured Quiz Generation)**: Sends the compact summary from Phase 1 to a smarter model (`openai/gpt-4o` or fallback) to build the final progressive 5-day quiz JSON, reducing overall token usage and API costs by 70–80%.
### Changed
- **Admin Form Simplification**: Removed the YouTube URL scraper box from the creation panel (due to persistent server-side bot-captcha blocking) and made the **Sermon Notes / Script / Transcript** text area the single required input field.
- **Removed Character Limits**: Removed the local transcript character limits so that users can paste full-length transcripts without truncation.

## [v2.14.1] — 2026-06-04
### Changed
- **Quiz for Christ Admin Improvements**: Removed the manual "Quiz Title" input field from the initial generation form. The title is now automatically generated by the AI from the sermon transcripts, and can be previewed/edited in the "Preview & Edit" section before saving or publishing.
- **System Version Pill**: Prepended the header version badge with "BETA" to display "BETA v2.14.1".
- **Modal Dialogs**: Replaced native browser `alert()` dialogs in the quiz admin panel with a custom inline `AlertModal` component to guarantee compatibility across mobile and PWA installations.

## [v2.14.0] — 2026-06-04
### Added
- **Quiz for Christ Gamification**: Added a weekly sermon-based drip quiz system integrated with the community feed.
  - **Admin Dashboard** (`app/(app)/quiz/admin/page.tsx`): AI-powered sermon quiz generator supporting YouTube transcript fetches and manual note fallbacks. Inline previewing, editing, saving draft, and publishing.
  - **Member Portal** (`app/(app)/quiz/page.tsx`): Interactive 5-day drip challenge (Tue–Sat) featuring: Balloon Pop (Multiple Choice), Fill the Blanks, In Your Own Words (AI-graded Essay), Verse Builder (Draggable scripture ordering), and Defend Your Faith (T/F + Explain).
  - **Brand Hub & Leaderboard** (`app/(app)/quiz/hub/page.tsx`): Brand landing page showcasing weekly and all-time standings along with past sermon quiz archives.
  - **Community Feed Integration** (`components/feed/PostCard.tsx`): Render quiz announcements and daily drip quizzes with custom "HGF Quiz For Christ" brand identities and quick-play CTA buttons.
  - **Spotlight Banner** (`components/feed/HeroCarousel.tsx`): Live quiz progress slide displayed in the dashboard header carousel.
  - **Server Cron Script** (`scripts/quiz-cron.mjs`): Standalone, zero-dependency node script to trigger daily quiz posts automatically.

## [v2.13.0] — 2026-05-20
### Added
- **TheWordTool — Sticky Toolbar**: File bar and formatting toolbar are now frozen/sticky at the top of the screen (like Excel's freeze panes). They stay visible while scrolling long scripts, so you never have to scroll back up to access tools. Includes iPhone notch safe-area support.
- **TheWordTool — Undo/Redo Buttons**: Added ↩ Undo and ↪ Redo buttons at the start of the toolbar. Works via browser's native undo stack (same as ⌘Z / ⌘⇧Z keyboard shortcuts).

## [v2.12.1] — 2026-05-20
### Fixed
- **TheWordTool — Import ETIMEDOUT**: Rewrote the import API to use Node.js native `https.get` with `family: 4` agent instead of `fetch()`. JustPaste.it has an IPv6 AAAA record that is unreachable from the DigitalOcean droplet — Node.js `fetch()` tries IPv6 first and hangs, while `curl` (which falls back to IPv4) works fine. Also added 15s timeout and redirect-following support.

## [v2.12.0] — 2026-05-20
### Added
- **TheWordTool — Import from JustPaste.it**: New "📥 Import" button in the file bar. Opens a modal where you can paste a JustPaste.it URL (full `justpaste.it/xxxxx` or short `jpst.it/xxxxx`). The tool fetches the content server-side via a new API route (`/api/thewordtool/import`), extracts the article text, and loads it directly into the editor — no copy-paste formatting issues.

### Fixed
- **TheWordTool — Paste formatting**: Rewrote the paste handler to collapse excessive blank lines. When pasting text from Notes, JustPaste.it, or other apps, consecutive newlines are collapsed so the text doesn't have huge gaps between every sentence. Single line breaks between content are preserved, but 3+ blank lines are reduced to a proper paragraph break.

## [v2.11.6] — 2026-05-13
### Fixed
- **TheWordTool — Scroll Centering**: Fixed the ▶▶ Next / double-tap advance scrolling too far, hiding text above the viewport. Replaced viewport-relative `getBoundingClientRect()` math with `offsetTop`-based calculation that correctly centers each paragraph in the visible area. Works reliably in both portrait and landscape orientations on tablets.

## [v2.11.5] — 2026-05-13
### Changed
- **TheWordTool — Tablet UX Enhancements**:
  - ▶▶ Next button is now dramatically larger and prominently styled (18–20px font, green glow, full-width on tablet/phone) so it's easy to press during live delivery
  - Double-tapping anywhere on the prompter screen now advances to the next paragraph (same as pressing ▶▶ Next), with a visual green ripple feedback
  - Auto-enters fullscreen when starting the prompter for distraction-free delivery
  - First-time users see a brief "Double-tap anywhere to go to next" hint that auto-dismisses after 3.5s
  - Mouse double-click also supported for desktop testing

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
