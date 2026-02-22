# HGF Attendance App — Comprehensive Documentation

> **Purpose:** This document is the canonical reference for the HGF Attendance Tracking App.
> It is a separate application from HGF Connect (the main member portal) but shares the same MySQL database (`hog_fellowship`).
> Read this before working on anything attendance-related.

---

## 1. Overview

The HGF Attendance App is a **dedicated tablet/desktop kiosk application** designed to be placed at the church entrance during services. It enables ushers and administrators to:

- Record member and visitor attendance in real-time
- Register new members or update existing member info on the spot
- View attendance reports with filters and CSV export
- Look up member usernames for the main HGF Connect portal
- Browse member birthdays by month
- Add missed members to past event attendance records

It is **not a public-facing app** — it is internal church staff tooling. The `<meta name="robots" content="noindex, nofollow">` tag prevents search engine indexing.

---

## 2. File Location & Access

| Item | Value |
|------|-------|
| **Root folder** | `/Applications/XAMPP/xamppfiles/htdocs/app.houseofgrace.ph/attendance/` |
| **Local URL** | `http://localhost/app.houseofgrace.ph/attendance/` |
| **Live URL** | `https://app.houseofgrace.ph/attendance/` |
| **Session name** | `ATTENDANCE_SESSION` (separate from main app's `PHPSESSID`) |
| **Database** | Same `hog_fellowship` MySQL database as the main app |
| **No separate DB** | All tables are shared — `members`, `events`, `attendance_records`, etc. |
| **Auth** | Separate session-based auth using `attendance/includes/attendance_auth.php` |
| **PWA** | Progressive Web App support via `sw.js` (service worker) and `offline.html` |

---

## 3. Folder Structure

```
attendance/
├── index.php                  ← Main dashboard (the kiosk home screen)
├── login.php                  ← Login page (attendance-specific sessions)
├── logout.php                 ← Logout (clears ATTENDANCE_SESSION only)
├── log_viewer.php             ← View attendance app file logs (admin only)
├── test_phone_validation.php  ← Dev utility to test phone normalization
├── offline.html               ← Offline fallback page (served by service worker)
├── sw.js                      ← Service worker for PWA / offline caching
│
├── config/
│   ├── attendance_config.php  ← Configuration constants (BASE_URL, AJAX URL helper)
│   └── (sms config shared from main ../config/sms.php)
│
├── includes/
│   └── attendance_auth.php    ← All auth functions for the attendance app
│
├── ajax/                      ← All AJAX endpoints (see Section 8)
│   ├── get_current_event.php
│   ├── get_attendance_count.php
│   ├── get_events.php
│   ├── get_member_details.php
│   ├── get_quick_stats.php
│   ├── get_birthdays.php
│   ├── search_members.php
│   ├── search_members_for_event.php
│   ├── record_attendance.php
│   ├── record_event_attendance.php
│   ├── register_member.php
│   ├── update_member.php
│   ├── export_attendance_report.php
│   └── get_attendance_report.php
│
├── widgets/                   ← Modal overlay panels loaded on demand
│   ├── attendance_widget.php  ← Record Attendance panel
│   ├── registration_widget.php ← Register/Update Member panel
│   ├── reports_widget.php     ← Attendance Reports panel
│   └── birthdays_widget.php   ← Member Birthdays panel
│
├── assets/
│   ├── css/                   ← Attendance-specific styles
│   └── js/                    ← Attendance-specific JavaScript
│
└── logs/                      ← App logs (same pattern as main app)
```

---

## 4. Authentication System (`attendance/includes/attendance_auth.php`)

### How Login Works

1. User visits `attendance/login.php` and submits username + password
2. `authenticateUser()` queries `members` table: `SELECT * FROM members WHERE username = ? OR email = ?`
3. Password verified with `password_verify()` (bcrypt)
4. On success, sets `ATTENDANCE_SESSION` PHP session variables:
   - `attendance_user_id` → `members.id`
   - `attendance_user_name` → `"First Last"`
   - `attendance_user_email` → `members.email`
   - `attendance_role` → `members.role`
   - `attendance_last_activity` → Unix timestamp
   - `attendance_login` → `true`
5. Redirects to `attendance/index.php`

### Role Restrictions

Only the following roles can access the attendance app:

| Role | Can Access |
|------|-----------|
| `admin` | ✅ Full access |
| `moderator` | ✅ Full access |
| `usher` | ✅ Full access |
| `user` | ❌ Redirected to login |

### Session Guard: `requireAttendanceAuth()`

Every attendance page and widget calls `requireAttendanceAuth()` at the top. It:
1. Uses `session_name('ATTENDANCE_SESSION')` then `session_start()`
2. Checks `$_SESSION['attendance_user_id']`
3. Updates `$_SESSION['attendance_last_activity']` on each request (session heartbeat)
4. Session expires after inactivity (configurable in `attendance_config.php`)
5. On failure: redirect to `attendance/login.php`

### SSO Integration with Main App

When the main HGF Connect app (`app.houseofgrace.ph/`) performs login:
- It calls `syncToAttendanceApp()` in `includes/auth.php`
- This writes to `ATTENDANCE_SESSION` automatically
- Users logged into the main app are automatically authenticated in the attendance app

When the main app logs out:
- It calls `clearAttendanceAppSession()`
- Destroys `ATTENDANCE_SESSION`

When the attendance app logs in:
- The main app's `isLoggedIn()` checks `ATTENDANCE_SESSION`
- Calls `syncFromAttendanceApp()` if `ATTENDANCE_SESSION` has valid admin/mod/usher

This bidirectional SSO means an usher who scans the attendance QR code URL is automatically logged into the main app as well, and vice versa.

---

## 5. Main Dashboard (`attendance/index.php`)

### Purpose
This is the kiosk home screen — designed to be visible on a tablet or large monitor at the church entrance. It is a fullscreen dashboard that stays open all service long.

### Layout Components

#### Top Information Bar
Three-column horizontally across the top:
- **Left:** Current event name and date + start time (auto-refreshes every 60 seconds via `get_current_event.php`)
- **Center:** Large attendance count number — "Present Today" — (auto-refreshes every 30 seconds via `get_attendance_count.php`)
- **Right:** Live clock showing current time (updates every second) and current date

The "current event" is automatically determined by the server: the first upcoming or today's event in the `events` table ordered by `event_date ASC, start_time ASC`. If no event today, it shows the next scheduled event.

#### Main Action Buttons (4 large tiles)
These are the primary controls for ushers:

| Button | Icon | Color | Widget Opened |
|--------|------|-------|--------------|
| **ATTENDANCE** | 👥 | Blue gradient (#4EB1CB) | `attendance_widget.php` |
| **REGISTER / UPDATE** | 📝 | Pink/Red gradient | `registration_widget.php` |
| **REPORTS** | 📊 | Blue/Cyan gradient | `reports_widget.php` |
| **BIRTHDAYS** | 🎂 | (styled same as others) | `birthdays_widget.php` |

Each button is `height: 250px` on desktop, `height: 120px` on tablet, `height: 100px` on mobile. They lift on hover with `translateY(-10px)`.

#### Status Bar (bottom)
Three elements across:
- **Left:** "Logged in as [Name] ([Role])"
- **Center:** Online/Offline indicator (green dot = online, red = offline) — checks `navigator.onLine` every 5 seconds
- **Right:** "🏠 Main App" link → `BASE_URL + "/"` and "Logout" button

### Widget System
When a button is clicked, `openWidget(type)` is called:
1. Fetches `widgets/{type}_widget.php` via AJAX
2. Extracts all `<script>` tags from the HTML response
3. Injects the HTML into `#widgetContent` inside a modal overlay `#widgetOverlay`
4. Executes the extracted scripts via `eval()` (to run widget initialization)
5. Calls the widget's `initialize{Type}Widget()` function
6. Widget animates in with CSS `scale(0.8)` → `scale(1)` transition

`closeWidget()` reverses the animation and clears `#widgetContent`.

### Auto-Refresh Intervals
| Interval | Function | Description |
|----------|----------|-------------|
| Every 1 second | `updateDateTime()` | Updates clock display |
| Every 30 seconds | `updateAttendanceCount()` | Polls `ajax/get_attendance_count.php` |
| Every 60 seconds | `updateEventInfo()` | Polls `ajax/get_current_event.php` |
| Every 5 seconds | `checkConnectionStatus()` | Checks `navigator.onLine`, triggers sync if online |

### Offline Support
- If `navigator.onLine` is `false`, the indicator shows "Offline" (red dot)
- An `offlineManager` object is initialized by `initializeOfflineManager()` (defined in `sw.js` layer)
- When connectivity is restored, `offlineManager.syncPendingRecords()` is called to push queued records to the server
- `offline.html` is served by the service worker when the network is completely unavailable

---

## 6. Widget 1: Record Attendance (`widgets/attendance_widget.php`)

### Purpose
The most-used widget. Called many times per service as members arrive. Designed for speed — a greeter can record attendance in under 5 seconds.

### UI Elements
| Element | ID | Description |
|---------|-----|-------------|
| Search input | `#memberSearch` | Type-to-search, debounced 300ms, minimum 3 characters |
| Search spinner | `#searchSpinner` | Spinning FA icon shown while request is in progress |
| Search results dropdown | `#searchResults` | Absolute positioned list below input, max-height 300px scrollable |
| Selected member card | `#selectedMember` | Shows selected member name + phone, hidden until selection |
| Selected name | `#selectedMemberName` | "First Last" |
| Selected details | `#selectedMemberDetails` | Phone number |
| Clear button | inside card | Removes selection, re-enables search |
| Submit button | `#submitAttendance` | Disabled until member selected, gradient blue |
| Success message | `#successMessage` | Green card, shown for 3 seconds after successful record |

### Data Flow — Member Search

```
User types 3+ chars in #memberSearch
  → debounced 300ms
  → POST ajax/search_members.php { query: "..." }
  → Server searches members.first_name + last_name via LIKE
  → Returns { success: true, members: [ { id, full_name, phone, attended_today } ] }
  → displaySearchResults() renders dropdown
    → Members who already attended today show green "✓ Already attended today"
    → These items have class "attended" (green left border)
```

### Data Flow — Recording Attendance

```
User clicks a search result
  → selectMember(id, name, phone, attendedToday) called
  → If attendedToday === true: confirm() dialog asks "Record again?"
  → Shows selected member card, enables submit button

User clicks "Record Attendance"
  → submitAttendance() called
  → Button text → "Recording..." (disabled)
  → POST ajax/record_attendance.php {
        member_id: selectedMemberId,
        event_id: currentEventId,  // PHP-injected from getCurrentEvent()
        csrf_token: csrfToken
      }
  → Server inserts into attendance_records table
  → Returns { success: true } or { success: false, message: "..." }
  → On success: showSuccessMessage() → green card for 3 seconds → form resets
  → attendanceCount in dashboard auto-refreshes (updateAttendanceCount() called)
```

### Special Cases
- If `data.sms_error` is present (attendance succeeded but SMS failed), a custom message is shown: "Attendance recorded successfully, but SMS notification could not be sent."
- If server returns `success: false`: `alert()` with error message, button re-enabled
- If network error occurs: `alert()` with connection error message, button re-enabled

---

## 7. Widget 2: Register / Update Member (`widgets/registration_widget.php`)

### Purpose
Used by ushers to register brand-new visitors or update existing member information during the service. Can also mark attendance simultaneously on registration/update.

### Two Modes

#### Mode A — Register New Member
Top button "Register New Member" (blue gradient) shows the registration form with all fields blank.

#### Mode B — Update Existing Member  
Top button "Update Existing Member" (green gradient) shows a search box above the form. The usher searches for the member, selects them, form auto-fills, save button changes to "Update Member" (blue).

### Registration Form Fields

| Field | Input Type | Required | Notes |
|-------|-----------|----------|-------|
| First Name | text | ✅ | Stored in `members.first_name` |
| Last Name | text | ✅ | Stored in `members.last_name` |
| Mobile Number | tel | No | Auto-formats to `09XXXXXXXXX` (PH format). Strips non-digits, auto-converts `+63` prefix to `0`. Max 11 digits. |
| Birth Date | date | No | Stored in `members.birthdate` |
| Age Group | radio (3 options) | ✅ | Kids (13 and below), Youth (14–21), Adult (22–75) |
| Registration Type | radio (3 options) | ✅ | Family Member, Growing Friend, New Friend |
| Address | textarea (3 rows) | No | Stored in `members.address` |
| Record Attendance | checkbox | Pre-checked | If checked, also inserts into `attendance_records` for today's event |

#### Age Group Definitions
| Option | Value | Age Range | Icon |
|--------|-------|-----------|------|
| Kids | `Kids` | 13 yrs old and below | 👧 red |
| Youth | `Youth` | 14 – 21 | 🎓 yellow |
| Adult | `Adult` | 22 – 75 | 👔 blue |

#### Registration Type Definitions
| Option | Value | Description | Icon |
|--------|-------|-------------|------|
| Family Member | `Family Member` | Faithfully attending and joyfully serving in a ministry | 👥 blue |
| Growing Friend | `Growing Friend` | Consistently attending for a month or more, exploring involvement | ✅ blue |
| New Friend | `New Friend` | Recently joined — invited by someone, discovering community | 👫 green |

### Search (Update Mode)
- Search field: name, phone, or member ID
- Uses `ajax/search_members.php` (same endpoint as attendance widget)
- Search results include: name, phone, member type, role
- Members with `admin/moderator/usher` roles are marked as `cannot-edit` (grey, cursor not-allowed, "Cannot edit admin/staff in attendance app")
- On selection: form fields pre-filled with member data via `ajax/get_member_details.php`

### Form Validation (`validateForm()`)
Before submission:
1. `first_name` — must not be empty
2. `last_name` — must not be empty
3. `age_group` — one radio must be selected
4. `type` — one radio must be selected
5. `phone` — if provided, must be 11 digits (09XXXXXXXXX format)
6. Shows red inline field error messages for each invalid field

### Data Flow — Registration

```
User fills form → clicks "Register Member"
  → validateForm() runs (client-side)
  → POST ajax/register_member.php {
        first_name, last_name, phone, birthdate,
        age_group, type, address,
        record_attendance: true/false,
        event_id: currentEventId,
        csrf_token
      }
  → Server:
      1. Normalizes phone to +63XXXXXXXXX format
      2. Checks for duplicate phone (SELECT WHERE phone = ?)
      3. Auto-generates username from first_name + last_name
      4. Sets status = 'pending' (no login credentials yet)
      5. Inserts into members table
      6. If record_attendance checked: inserts into attendance_records
      7. Returns { success: true, member_id, username, message }
  → On success: success message shown with "New username: [username]"
  → Form resets after 5 seconds
```

### Data Flow — Update

```
User searches → selects member → form fills → edits → clicks "Update Member"
  → POST ajax/update_member.php {
        member_id, first_name, last_name, phone, birthdate,
        age_group, type, address,
        record_attendance: true/false,
        event_id: currentEventId,
        csrf_token
      }
  → Server:
      1. Validates member_id exists
      2. Checks role — refuses update if admin/mod/usher
      3. Normalizes phone
      4. Checks duplicate phone (excluding current member)
      5. UPDATE members SET ... WHERE id = ?
      6. If record_attendance checked: inserts attendance_records
      7. Returns { success: true, message }
  → On success: success message → form resets after 5 seconds
```

### URL Parameter Pre-fill
The form supports pre-populating from URL query parameters:
- `?first_name=John&last_name=Doe&phone=09...&age_group=Adult&type=New+Friend`
- Used for internal linking from other parts of the system

---

## 8. Widget 3: Attendance Reports (`widgets/reports_widget.php`)

### Purpose
A full-featured attendance analytics dashboard used by admins and moderators to review attendance data in real-time during or after a service.

### Section 1 — Quick Stats (4 metric cards)
| Card | ID | Description |
|------|-----|-------------|
| Today's Attendance | `#todayCount` | Count of records for today |
| This Week | `#weekCount` | Count for the current week |
| This Month | `#monthCount` | Count for the current month |
| Total Members | `#totalMembers` | Total active members in database |

All 4 values fetched via `ajax/get_quick_stats.php` on widget load.

### Section 2 — Report Table with Filters

#### Report Type Filter (dropdown)
| Option | Value | Description |
|--------|-------|-------------|
| Today's Attendance | `today` | All records for today's date |
| Event Attendance | `event` | Pick a specific event from dropdown |
| This Week | `week` | Monday to Sunday of current week |
| This Month | `month` | First to last day of current month |
| Custom Date Range | `custom` | Show from/to date pickers |

Changing the dropdown or dates triggers `updateReport()` automatically.

#### Event Attendance Mode
When "Event Attendance" is selected, a second dropdown appears — `#eventSelect` — populated from `ajax/get_events.php`. Lists all events ordered by date descending (most recent first).

#### Custom Date Range Mode
When "Custom Date Range" is selected, `#startDate` and `#endDate` date inputs appear. `updateReport()` fires on change.

#### Action Buttons
| Button | Function | Description |
|--------|----------|-------------|
| 🔄 Refresh | `refreshReport()` | Re-fetches current report data |
| 📊 Export | `exportReport()` | Downloads CSV file via `ajax/export_attendance_report.php` |

#### Report Table Columns
| Column | Description |
|--------|-------------|
| No. | Sequential row number |
| Name | Member's full name |
| Member Type | Badge: Family Member (blue), Growing Friend (pink), New Friend (green), Usher (orange) |
| Date | Attendance date |
| Time | Time recorded (check-in time) |
| First Visit | Green "First Visit" badge if `is_first_visit = 1`, else blue "Returning" |
| Contact | Member's phone number |

### Section 3 — Summary (shown below table when data loads)
| Field | ID | Description |
|-------|-----|-------------|
| Total Attendance | `#summaryTotal` | Total records count |
| First-time Visitors | `#summaryFirstVisit` | Count of `is_first_visit = 1` |
| Regular Members | `#summaryMembers` | Count of Family Members |
| Volunteers | `#summaryVolunteers` | Count of ushers/volunteers |

### Section 4 — Username Lookup
A read-only search tool that lets ushers tell members what their login username is for the HGF Connect portal.

- Search by name (type 3+ chars)
- Results show: Member name, phone, **big highlighted username box**
- Calls `ajax/search_members.php` (returns `username` field)
- Cannot edit — display only

### Section 5 — Add Member to Event
Used when a member attended but was accidentally not recorded.

1. User selects an event from the dropdown (populated from `ajax/get_events.php`)
2. User searches for the member by name
3. Selected member shown in card
4. Clicks "Add to Event"
5. Calls `ajax/record_event_attendance.php { member_id, event_id, csrf_token }`
6. Inserts into `attendance_records` with the selected event's date
7. Success message shown

### Data Flows — Reports Widget

```
Widget opens
  → ajax/get_quick_stats.php → 4 stat numbers
  → ajax/get_events.php → populates event dropdown
  → updateReport() called → ajax/get_attendance_report.php { type: 'today' }
  → Table populated

User changes filter
  → updateReport() with new params
  → ajax/get_attendance_report.php { type, start_date?, end_date?, event_id? }
  → Table re-populated, summary updated

User clicks Export
  → exportReport() 
  → window.location.href → ajax/export_attendance_report.php?type=...&start_date=...
  → Server streams CSV file download
  → CSV columns: No, Name, Member Type, Date, Time, First Visit, Contact
```

---

## 9. Widget 4: Birthdays (`widgets/birthdays_widget.php`)

### Purpose
Shows member birthdays for a given month. Used by ushers/greeters to personally congratulate members when they arrive. Adds a personal, caring touch to the church welcome experience.

### Layout
- **Month Navigation:** ‹ Previous / [Month Year] / Next › buttons
- **Birthday List:** Cards sorted by day of month
- **Stats Footer:** 4-column grid (Total This Month, Today, This Week, Upcoming)

### Birthday Item Card
Each birthday entry shows:
- 🎂 icon on left
- **Member name** (full name)
- Date (e.g., "February 22")
- Age text:
  - "Turning X" (if birthday is upcoming this year)
  - "Now X" (if birthday has passed this year)
- Member type badge (Family Member / Growing Friend / New Friend) with matching colors
- Status badge on right:
  - 🟡 **Today!** (yellow) — `badge-today`
  - 🔵 **This Week** (blue) — `badge-this-week`
  - 🟢 **Upcoming** (green) — `badge-upcoming`
  - 🔴 **X Days Ago / X Weeks Ago / X Months Ago** (red) — `badge-past`

### Timezone Handling
Client-side: `new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))` — all comparisons are done in Manila time, not browser/server local time.

### Data Flow

```
Widget opens (or month navigated)
  → POST ajax/get_birthdays.php { month: 1-12, year: YYYY }
  → Server: SELECT id, first_name, last_name, birthdate, type
             FROM members
             WHERE MONTH(birthdate) = ? AND status = 'active'
             ORDER BY DAY(birthdate) ASC
  → Returns {
        success: true,
        birthdays: [ { first_name, last_name, day, birth_year, member_type } ],
        stats: { total_this_month, today, this_week, upcoming }
    }
  → displayBirthdays() renders cards with badge logic
  → displayStats() renders 4-column stat grid
```

---

## 10. AJAX Endpoints Reference (`attendance/ajax/`)

All endpoints require a valid `ATTENDANCE_SESSION`. They return JSON `{ success: bool, ... }`.
All POST requests accept `application/json` body.

| File | Method | Auth Required | Description |
|------|---------|---------------|-------------|
| `get_current_event.php` | GET | Yes | Returns the current/next upcoming event |
| `get_attendance_count.php` | GET | Yes | Returns today's attendance count for current event |
| `get_events.php` | GET | Yes | Returns all events ordered by date DESC |
| `get_member_details.php` | POST `{ member_id }` | Yes | Returns full member data for pre-filling update form |
| `get_quick_stats.php` | GET | Yes | Returns 4 stats: today, week, month, total members |
| `get_birthdays.php` | POST `{ month, year }` | Yes | Returns birthdays + stats for given month |
| `search_members.php` | POST `{ query }` | Yes | Searches members by name (3+ chars), returns attended_today flag |
| `search_members_for_event.php` | POST `{ query, event_id }` | Yes | Like above but marks who attended a specific event |
| `record_attendance.php` | POST `{ member_id, event_id, csrf_token }` | Yes | Records attendance; logs to app_logs; returns SMS send result |
| `record_event_attendance.php` | POST `{ member_id, event_id, csrf_token }` | Yes | Manually adds attendance for a specific past event |
| `register_member.php` | POST `{ ...fields, csrf_token }` | Yes | Registers new member; optionally records attendance |
| `update_member.php` | POST `{ member_id, ...fields, csrf_token }` | Yes | Updates existing member; refuses admin/mod/usher |
| `export_attendance_report.php` | GET `?type&start_date&end_date&event_id` | Yes | Streams CSV file download |
| `get_attendance_report.php` | POST `{ type, start_date?, end_date?, event_id? }` | Yes | Returns attendance data for report table |

### CSRF Token System
`generateCSRFToken()` is defined in `attendance_auth.php`. It:
1. Generates a random token via `bin2hex(random_bytes(32))`
2. Stores in `$_SESSION['csrf_token']`
3. All write requests (record, register, update) validate the token server-side
4. Mismatch returns `{ success: false, error: "Invalid CSRF token" }`

---

## 11. Database Tables Used

The attendance app reads/writes to the following shared tables:

| Table | Operations | Notes |
|-------|-----------|-------|
| `members` | SELECT, INSERT, UPDATE | Core member lookup and registration |
| `events` | SELECT | Read-only — events created in main app only |
| `attendance_records` | SELECT, INSERT | Primary insert target |
| `app_logs` | INSERT | Every attendance record is also audit-logged |

### Attendance Records Insert

```sql
INSERT INTO attendance_records 
  (member_id, event_id, attendance_date, attendance_time, recorded_by, is_first_visit)
VALUES
  (?, ?, CURDATE(), CURTIME(), ?, ?)
```

`is_first_visit` is determined by checking if the member has any previous `attendance_records`. If count = 0, `is_first_visit = 1`.

`recorded_by` = `$_SESSION['attendance_user_id']` (the usher/admin who clicked Record).

---

## 12. Login Page (`attendance/login.php`)

| Field | Description |
|-------|-------------|
| Username or Email | Works with either `members.username` or `members.email` |
| Password | Verified with `password_verify()` against `members.password` (bcrypt) |

After successful login:
- Redirects to `attendance/index.php`
- SSO: syncs to main app session

If already logged in, automatically redirects to `index.php`.

Login page shows the HGF logo and a simple centered card form. No password reset functionality exists in the attendance app — must be done via the main app's profile page.

---

## 13. Log Viewer (`attendance/log_viewer.php`)

Admin-only utility that reads the attendance app's file-based logs from `attendance/logs/`. Displays log entries in a formatted table with:
- Timestamp
- Log type (error, info, etc.)
- Message content

Access restricted to `admin` role only.

---

## 14. Progressive Web App (PWA)

### Service Worker (`attendance/sw.js`)
```
Strategy: Cache First for static assets, Network First for dynamic content
Cached: index.php, login.php, offline.html, CSS, JS, Font Awesome icons
Offline fallback: offline.html served when network is unavailable
```

### Offline Mode Support
- Offline queue: attendance records typed while offline are stored locally
- When connectivity restored, `offlineManager.syncPendingRecords()` pushes queued records
- The connection indicator in the status bar shows green (Online) or red (Offline) in real time

### Installing as PWA
On Chrome/Edge: click the install icon in the address bar. App installs to the home screen. On mobile tablets used as kiosks, this allows full-screen kiosk mode without browser chrome.

---

## 15. Color Palette & Branding

| Color | Hex | Usage |
|-------|-----|-------|
| Primary blue | `#4EB1CB` | Buttons, borders, number colors, badge gradients |
| Dark primary | `#3A95AD` | Button hover states |
| Success green | `#48bb78` | Success messages, first-visit badges |
| Danger red | `#e53e3e` | Logout button, delete/cancel actions |
| Neutral | `#2d3748` | Primary text |
| Muted | `#718096` | Subtitle text, secondary info |
| Background | `linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)` | Page background |

---

## 16. Key Business Rules

| Rule | Implementation |
|------|---------------|
| Same member can attend twice in one day | Warns with `confirm()` but allows it |
| Phones must be Philippine format | Auto-formatted to `09XXXXXXXXX`, normalized to `+63XXXXXXXXX` for SMS |
| New members created with `status = 'pending'` | They cannot log into main app until admin approves (sets active) |
| Cannot edit admin/mod/usher via attendance app | Update widget rejects `role in (admin, moderator, usher)` |
| No member-facing auth | Attendance app is staff-only; members use the main HGF Connect portal |
| Session name is isolated | `ATTENDANCE_SESSION` never conflicts with main app's `PHPSESSID` |
| CSRF protection on all writes | Validated server-side before any INSERT/UPDATE |
| First visit detection | `SELECT COUNT(*) FROM attendance_records WHERE member_id = ?` — if 0, marked as first visit |

---

## 17. Next.js Rewrite Notes (Attendance App)

When rewriting in Next.js:

| Current PHP | Next.js Equivalent |
|-------------|-------------------|
| `session_name('ATTENDANCE_SESSION')` | Separate NextAuth provider or same provider with role guard |
| `widgets/attendance_widget.php` | React modal/drawer component (`AttendanceModal.tsx`) |
| `widgets/registration_widget.php` | React form component (`MemberRegistrationModal.tsx`) |
| `widgets/reports_widget.php` | React page + table component (`ReportsModal.tsx`) |
| `widgets/birthdays_widget.php` | React component with `date-fns` or `Day.js` + TZ plugin |
| `ajax/record_attendance.php` | `POST /api/attendance/record route.ts` |
| `ajax/register_member.php` | `POST /api/members route.ts` (CREATE action) |
| `ajax/update_member.php` | `PATCH /api/members/[id] route.ts` |
| `ajax/get_attendance_report.php` | `GET /api/attendance/report?type=today&...` |
| `ajax/export_attendance_report.php` | `GET /api/attendance/export` → stream CSV response |
| Offline PWA via `sw.js` | Next.js PWA plugin (`next-pwa`) + Workbox strategy |
| Auto-refresh via `setInterval` | React `useEffect` with `setInterval` + cleanup |
| CSRF via session token | Built-in CSRF from NextAuth or custom header check |
| Shared DB with main app | Same Prisma client, same MySQL database |
| `getAttendanceAjaxUrl()` helper | `process.env.NEXT_PUBLIC_API_BASE_URL` or relative `/api/` routes |

**Key decision:** The attendance app can be part of the SAME Next.js app as the main portal, just behind a separate route group `(attendance)/` with its own layout and role middleware. This eliminates the SSO complexity entirely — they share the same NextAuth session.
