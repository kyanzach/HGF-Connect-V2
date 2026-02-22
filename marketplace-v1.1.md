HGF Connect Marketplace — Complete Detailed Feature Description (Reveal Discount + Contact Seller + Love Gift Fixed Amount)

Overview

- Public, SEO-friendly marketplace where listings are viewable by anyone (no login required). Designed for discoverability and easy sharing.
- Sellers set an original price, a discounted (promotional) price, and a fixed Love Gift amount (a fixed currency value) they will give to the sharer of a confirmed sale.
- Sharers create tracked Share & Bless links that include a token so impressions, CTA clicks, and prospect submissions are recorded and attributed.
- Discounted price is strictly gated and revealed only after a prospect completes a required action (modal form). A second CTA (“Contact the seller”) collects stronger prospect information (name + mobile) and also reveals the discount after submission.
- Attribution is first-come, first-served at the prospect conversion level; sellers manually confirm sales and assign the Love Gift to the correct prospect/sharer token.

Seller listing setup

- During listing creation the seller must enter:- Listing title and description
- Primary item image(s)
- Original price (OG price) — the public reference price shown initially on the listing
- Discounted price — the promotional price that will be revealed only after the prospect submits required info
- Fixed Love Gift amount (currency) — e.g., PHP 100 — displayed as the thank-you for a confirmed sale via sharing
- Visibility settings (public by default)


- Guidance copy for seller when setting Love Gift: “Set the fixed Love Gift amount as a simple thank-you to those who help share this offer. This is a fixed amount per confirmed sale.”

Share & Bless link and social preview (OG)

- Sharer generates a Share & Bless link for the listing. Link pattern example: /marketplace/[slug]-[id]?ref=SHARE_TOKEN
- Server-side generated Open Graph tags for the share link use sharer-specific text to increase CTR:- OG Title: “[SharerName] has shared this discounted {ItemName}: {OriginalPrice} → {DiscountedPrice}”
- OG Description: “[SharerName] thinks you’ll be interested and wanted to share this discount with you.”
- OG Image: primary item image


- These OG tags are rendered server-side so social platforms show the intended preview and crawlers index the page correctly.

Public listing page (no login required)

- What is shown before prospect action:- Item images and gallery
- Full listing description and any specs
- Original price (clearly visible)
- Love Gift badge showing fixed amount: “Love Gift: PHP 100 — Share & Bless”
- Two prominent CTAs (discount remains hidden until action):- Primary CTA (prominent): “Reveal discount”
- Secondary CTA (below): “Contact the seller”


- Small explanatory footnote: “Discounted price revealed after you complete a short form — this helps track referrals so sharers receive their Love Gifts.”

Reveal Discount flow (Primary CTA)

- Purpose: Gate the discounted price to collect minimal prospect info and capture attribution.
- Modal fields and behavior:- Header: “See discounted price”
- Body: short explanation: “Enter your full name to view the discounted price and receive seller contact. This helps us track referrals so we can thank the sharer with a Love Gift.”
- Fields: Full name (required). Optional: email or phone (optional). Checkbox: “I agree to be contacted by the seller” (recommended).
- Button text: “Reveal discount”


- On submit:- The server logs a prospect record tied to the listing and share token (if present), capturing prospect_name, optional contact info, IP hash, user agent, and timestamp.
- The modal reveals the discounted price and either the seller contact details (if seller chose to show) or a “Request contact” CTA that opens a secure in-app contact form.
- The page shows a confirmation message: “Discount revealed — seller contact shown if provided. Someone from HGF Connect may reach out to confirm details.”

Contact the seller flow (Secondary CTA)

- Purpose: Capture stronger lead information (required phone) and immediately deliver prospect to the seller for follow-up.
- Modal fields and behavior:- Header: “Contact the seller”
- Body: “Provide your full name and mobile number so the seller can follow up and help you with this offer.”
- Fields: Full name (required), Mobile number (required), Email (optional). Checkbox: “I agree to be contacted by the seller” (required to send contact).
- Button text: “Send contact request”


- On submit:- The server logs a prospect record (including mobile) tied to listing and share token.
- Optionally auto-sends seller a secure in-app message or email with prospect info (based on seller preference).
- The modal reveals the discounted price and shows confirmation: “Your contact request was sent to the seller. Expect contact soon.”

Prospect record & tracking

- Each prospect submission creates a prospect record capturing:- listing_id, share_token (if any), sharer_user_id (if any), prospect_name, prospect_mobile (if provided), prospect_email (if provided), ip_hash, user_agent, timestamp, action_type (reveal/contact), and status (revealed/contacted/pending/converted).


- If a prospect uses “Reveal discount” then later “Contact the seller,” the system attempts to merge those actions into one prospect record (by session cookie or matching name/time window). If merging fails, allow seller to merge duplicates later.
- The system logs impressions and CTA clicks server-side when listing pages are loaded/accessed with a share token.

Attribution & first-come, first-served rule

- The conversion event that can win a Love Gift is the prospect submission record that the seller later confirms as the buyer.
- When confirming a sale, the seller chooses the prospect record (from the table of prospect records) that corresponds to the actual buyer; that prospect record includes the sharer token. The sharer whose token is attached to that prospect record receives the fixed Love Gift.
- If multiple prospects convert to real purchases, seller confirms each sale individually and credits Love Gifts per confirmed sale accordingly.
- If a prospect arrives via multiple share links (clicked several times), the first clicked token/time-stamped token is used by default to assign the prospect record’s sharer attribution. Seller confirmation should map to the prospect record for accuracy.

Seller dashboard: prospects and confirmations

- Seller sees, per listing, a table with columns:- Sharer (name, link to sharer profile if available)
- Prospect name
- Prospect mobile (if provided) / Email (if provided)
- Event type (reveal/contact)
- Timestamp
- Status (pending, contacted, converted, rejected)
- Love Gift promised (fixed amount)
- Actions: View prospect details, message prospect (in-app), confirm sale & credit Love Gift, flag suspicious record


- When confirming a sale, seller selects the prospect record and clicks “Confirm sale & credit Love Gift.” This records the confirmation with timestamp, seller id, and evidence note optionally uploaded.
- The system then credits the sharer’s dashboard with the fixed Love Gift amount (pending/paid status depending on seller’s workflow).

Sharer dashboard & notifications

- Sharer’s dashboard shows:- Listings shared (with share tokens)
- Number of impressions, CTA clicks, prospect submissions generated via their share link
- Confirmed Love Gifts and pending Love Gifts
- History log showing when a prospect they referred submitted info and when a seller confirmed a sale


- Sharers receive notifications:- When their shared link generates a prospect submission (optional)
- When a seller confirms a sale that credits them with a Love Gift

Messaging & seller follow-up

- Sellers can contact prospects via the contact details provided or via in-app messaging. If prospect only provided a name, seller may request contact info via in-app message or wait for prospect to provide mobile later.
- In-app messaging logs attempts and timestamps to support audit trail for confirmations.

Copy, UX and CTAs (recommended)

- Listing badge: “Love Gift: PHP X — Share & Bless”
- Primary CTA: “Reveal discount”
- Secondary CTA: “Contact the seller”
- Reveal modal header: “See discounted price”
- Reveal modal body: “Enter your full name to view the discounted price and receive seller contact. This helps us track referrals so we can thank the sharer with a Love Gift.”
- Contact modal header: “Contact the seller”
- Contact modal body: “Provide your full name and mobile number so the seller can follow up. We’ll reveal the discounted price after submission.”
- Seller confirm button: “Confirm sale & credit Love Gift”
- Sharer notification: “Good news — your share led to a confirmed sale! You’ve been credited PHP X Love Gift.”

Privacy, consent and trust language

- On each modal include a short privacy note:- “We’ll share your contact only with the seller to help complete this purchase. By submitting you agree to be contacted regarding this listing. Read our privacy policy for details.”


- Allow prospects to opt-out of direct contact while still revealing discount by leaving mobile blank and unchecking contact consent — they will be tracked by name only.
- Provide sellers with minimal required buyer info unless prospect consents to share more.

Anti-abuse, integrity & admin controls

- Require seller to map confirmations to prospect records — prevent manual crediting with no prospect evidence.
- Maintain audit logs: who confirmed, when, and which prospect record was used; allow admin review for disputes.
- Reputation indicators: seller trust badges (verified, number of confirmed sales) to promote honesty.
- Rate-limits: limit number of prospect submissions per IP for a short window to reduce spam.
- Allow sellers to flag suspicious prospect records for admin review.

Edge cases & handling

- Duplicate prospects: attempt to merge by session/cookie or match names/time window; provide seller tools to merge duplicates.
- Prospects that reveal discount but never provide contact: seller may still confirm sale if buyer proves purchase; admin may require evidence for Love Gift crediting.
- Multiple sharers: follow first-come attribution per prospect record; multiple confirmed sales may credit multiple different sharers.
- Expiry and revocation: sellers may set listing expiry or revoke share tokens if promotion ends.

Sample flow summary

1. Seller lists item, sets OG price, discounted price, and Love Gift (fixed amount).
2. Sharer generates Share & Bless link and shares it; social preview shows sharer-specific OG title/description/image.
3. Prospect clicks link (no login required), sees listing with OG price and CTAs.
4. Prospect clicks “Reveal discount” or “Contact the seller.” Modal collects info; server logs prospect tied to share token and reveals discounted price.
5. Seller follows up and closes sale offline or on-platform.
6. Seller confirms sale in dashboard by selecting the prospect record; system credits the sharer’s Love Gift.
7. Sharer receives notification and dashboard update showing earned Love Gift.

Example short copy for social preview

- OG Title: “Ryan has shared this discounted Bible Study Guide. Exclusive discount!”
- OG Description: “Ryan thinks you’ll be interested and wanted to share this discount with you.”
- OG Image: Item image

Final notes

- The discount must never be revealed prior to prospect submission — gating must be enforced server-side.
- Both CTAs (Reveal discount and Contact the seller) capture attribution and log prospect records; Contact collects stronger lead data (mobile).
- Attribution, manual seller confirmation, and fixed Love Gift amounts preserve community trust and simplicity.
- Listings remain public and SEO-friendly, while the gated reveal flow increases lead quality and supports transparent Love Gift distribution.

If you want, I can now:

- produce short in-app help text that explains the Love Gift flow for sellers, sharers, and prospects,
- draft the minimal modal copy variations and privacy statements for immediate use,
- or create a concise one-page FAQ for marketplace users explaining how to share, reveal, contact, and claim Love Gifts. Which should I prepare next?