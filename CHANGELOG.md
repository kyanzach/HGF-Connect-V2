# Changelog

All notable changes to HGF Connect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
