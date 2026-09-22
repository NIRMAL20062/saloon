@AGENTS.md
> **Client migration in progress:** the mobile client is moving from Expo/React Native to native Kotlin + Jetpack Compose. Read `docs/NATIVE_ANDROID_PLAN.md` and `docs/NATIVE_ANDROID_SPEC.md` before starting any new client work. **The backend below is unchanged and reused as-is** — same Supabase schema, RLS, and Edge Functions; everything in this document about Phases 1–5's server-side behavior, security rules, and product rules still applies verbatim. Only the client implementation (currently described below as Expo/React Native) is being replaced.

# GLIDE — AI Development Context & Roadmap

**Purpose of this document:** paste this into your AI coding assistant (Claude Code, Cursor, etc.) as project context. It tells the AI what GLIDE is, how to behave while building it, and exactly what to implement in each phase — screens, tables, fields, server logic, security controls, and tests — so it can act on this without you having to re-explain the product every session.

**Builder:** first-time Android developer. Dev machine: MSI Modern 14, 8 GB RAM, Ubuntu.
**Stack:** Expo SDK 54 (React Native 0.81 + TypeScript, Expo Router 6) + Supabase (Auth, Postgres, RLS, Realtime, Edge Functions) + Razorpay — **being replaced client-side per the migration note above; Supabase/Razorpay stay.**

> **Note for the AI assistant:** Expo has changed significantly across versions. Before writing any Expo-related code, check the exact versioned docs at `https://docs.expo.dev/versions/v54.0.0/` rather than relying on older training data or older tutorials.

---

## 1. What GLIDE is

GLIDE is an on-demand barber & salon booking app for Android, with two booking modes:

1. **Slot Booking** — customer picks a shop, barber, service, and a future time.
2. **Instant Booking** — customer requests a service now; nearby eligible shops get the request, first to accept wins.

Core promise: no phone calls, no manual confirmation by a human. A booking becomes real only when three independent things line up automatically:

```
SHOP ACCEPTS  +  CUSTOMER PAYS  +  CUSTOMER VERIFIED ON ARRIVAL
                        ↓
                "START SERVICE" UNLOCKS
```

Three apps share one Supabase backend:
- **Customer app** (Android, Expo)
- **Partner app** (same Expo codebase, role-based routing) — shop owners/barbers
- **Admin dashboard** (web, built in Phase 12) — exceptions and configuration only, never routine approvals

### 1.1 Who this is for (personas)

- **Customer — "Rohan," 24, office worker.** Wants a haircut without waiting in a shop or calling ahead. Books a slot for Saturday morning, or hits "book now" on a lazy weekday evening. Cares about: not paying until someone actually commits to serving him, not getting scammed by a fake acceptance, getting his money back cleanly if something falls through.
- **Partner — "Suresh," shop owner, 2 chairs, 1 employee barber.** Not deeply technical. Wants fewer no-shows, wants to fill idle chair time with instant bookings, wants payouts to just show up in his bank account without emailing anyone. Cares about: not getting stuck with a booking he can't fulfill, being paid reliably and on a predictable schedule.
- **Admin — solo founder (the builder) initially.** Needs to resolve disputes and configure business rules (commission %, cancellation windows, instant-booking radius) without shipping a new app version every time a number needs to change. Should almost never need to manually approve a routine booking — the system self-serves those.

### 1.2 Why the "three things must line up" rule exists

Each of the three conditions closes a specific failure mode that a naive booking app has:
- **Shop accepts** — without this, customers could book slots shops never agreed to, or shops get stuck with bookings they can't service (barber sick, fully booked).
- **Customer pays** — without this (or if payment happens too early), a shop could accept, then the customer bails, and there's no money on the table to make either side whole. Charging *before* acceptance is worse: money would be held against a booking that might get rejected, creating refund churn for something that was never real.
- **Verified on arrival** — without this, "Start Service" could be triggered by anyone who walks in, or a customer could claim non-service and dispute a completed booking. It also stops a shop from marking a booking "completed" (and eligible for payout) when the customer never showed up.

Any future feature that wants to skip one of these three checks is a red flag — stop and reconsider rather than build it.

---

## 2. Rules for the AI assistant — read this before writing any code

1. **One phase, one feature, at a time.** Never scaffold the whole app, whole database, or whole navigation tree in one go. Finish and confirm the current feature before touching the next.
2. **Stop and ask before moving to the next phase.** After a feature works, summarize what was built, exactly how to test it, and wait for confirmation.
3. **Every feature ships with something runnable.** Give the exact command to run and what should appear on screen or in the Supabase table editor — the builder is verifying by looking, not by reading code.
4. **Explain, don't just dump code.** Say which file the code goes in, why it's structured that way, and what breaks if a step is skipped.
5. **Keep the machine light.** 8 GB RAM: prefer Expo Go on a physical phone over the emulator; use the hosted Supabase project, not local Docker; don't suggest running Metro + emulator + local Supabase + a heavy browser session simultaneously. Only reach for Android Studio when a native module truly requires it.
6. **Name things for the end state, build only what the phase needs.** Use the field/table names in Section 6 from the start so nothing needs renaming later — but don't create a later phase's table or column early.
7. **Server decides money and state, always.** Prices, booking status, and payment status are calculated/set in Supabase Edge Functions, never trusted from the app. This is enforced starting Phase 5, but no earlier phase should design itself in a way that assumes the client can be trusted.
8. **Every feature gets the test pass listed in its phase before it's "done."** Don't skip this because it looks like it works.
9. **No feature from a later phase leaks into an earlier one.** If Phase 2 code adds an Instant Booking field "since we'll need it anyway," that's out of scope — note it as a comment/TODO instead and move on.
10. **When scope is unclear, build less and ask.** A half-built extra feature is worse than a clean stopping point at the end of a phase.
11. **Security is not a later phase.** RLS, input validation, and "never trust the client" apply to whatever table/function exists *today*, from the day it's created — Phase 13 only *audits* this, it doesn't introduce it for the first time.
12. **Every schema change is a migration file, never a manual table-editor edit once Phase 1 is done.** Manual edits in the Supabase table editor are fine for *seeding data* (Phase 2) but never for changing structure — every column/table change goes through `supabase/migrations/`, checked into git, so the schema history is reproducible.
13. **Write the test before/alongside the code for anything touching money or status transitions.** Booking state machine transitions, payment webhook handling, and refund logic get an automated test (Phase 5 onward) — not just a manual click-through.

---

## 3. Non-negotiable product rules

- No queue/walk-in tokens, no rider app, no pickup/drop — permanently out of scope for this MVP.
- Full online payment via Razorpay, and only **after** the shop accepts — never before.
- Instant Booking never charges while searching; it charges once a shop accepts and the exact price is locked.
- A paid, shop-accepted booking still can't start service — the customer must be verified in person (QR or 6-digit code) before "Start Service" unlocks.
- Razorpay secret keys and the Supabase service-role key never touch the mobile app.
- RLS protects every user-facing table from the moment the table is created, not bolted on later.
- Every webhook (payment, refund, payout) is idempotent — a duplicate delivery must never double-charge, double-refund, or double-confirm.
- Admin dashboard handles exceptions and configuration, never routine booking approval.
- Every state transition on `bookings` and `payments` is server-authoritative and leaves an audit trail (`booking_events`) — no status is ever set directly from a client mutation.
- Personally identifiable information (phone numbers, exact addresses, payment details) is never logged in plaintext, sent to analytics, or included in crash reports.

---

## 4. Architecture overview

```
                     ┌─────────────────────┐
                     │   Customer App      │
                     │  (Expo / Android)   │
                     └──────────┬──────────┘
                                 │  Supabase client SDK
                                 │  (anon key, RLS-scoped)
┌─────────────────────┐         │         ┌──────────────────────┐
│   Partner App        │────────┼─────────│   Admin Dashboard     │
│  (Expo, same codebase,│        │         │   (Next.js, web)       │
│   role-routed)        │        │         │   Phase 12 only        │
└──────────┬───────────┘         │         └───────────┬──────────┘
           │                     │                     │
           ▼                     ▼                     ▼
   ┌─────────────────────────────────────────────────────────┐
   │                      Supabase project                    │
   │  ┌────────────┐ ┌───────────────┐ ┌────────────────────┐ │
   │  │  Postgres   │ │  Auth (OTP)   │ │  Realtime channels  │ │
   │  │  + RLS      │ │               │ │                      │ │
   │  └────────────┘ └───────────────┘ └────────────────────┘ │
   │  ┌──────────────────────────────────────────────────────┐ │
   │  │  Edge Functions (Deno) — the only place that:         │ │
   │  │  - talks to Razorpay with the secret key               │ │
   │  │  - computes prices, sets booking/payment status         │ │
   │  │  - verifies webhook signatures                          │ │
   │  └──────────────────────────────────────────────────────┘ │
   └──────────────────────────────┬────────────────────────────┘
                                  │  server-to-server, secret keys live here only
                                  ▼
                     ┌─────────────────────┐
                     │      Razorpay        │
                     │  Orders / Payments /  │
                     │  Refunds / Route       │
                     └─────────────────────┘
```

**Trust boundary, stated plainly:** the Expo app (customer or partner) is *never* trusted to compute a price, set a booking/payment status, or decide a booking outcome. It can only (a) read what RLS allows it to read, and (b) call an Edge Function and react to what that function returns. Every Edge Function re-validates its inputs against the database — it never assumes the caller's claimed booking ID, shop ID, or amount is honest.

### 4.1 Why Supabase Edge Functions instead of client-side logic

A first-time Android dev might be tempted to compute the total price or flip a booking to "confirmed" directly from the app using an authenticated Supabase client call (`update()` on the `bookings` table). This is explicitly disallowed for money- or state-affecting writes because:
- The app's code and network traffic are inspectable/interceptable by the user running it (any Android app is). Anything decided client-side can be tampered with (modified request payloads, rooted devices, proxy tools like mitmproxy).
- RLS controls *row access*, not *business rules* — RLS can stop a customer from updating someone else's booking, but it can't validate "is this actually a legal state transition" or "does this price match what the service actually costs." That logic belongs in an Edge Function.
- Edge Functions run with the service-role key server-side, so they're the only place allowed to bypass RLS deliberately and safely, after doing their own checks.

---

## 5. Security — read this section fully before Phase 1

Security is treated as a first-class feature, built incrementally alongside functionality, not bolted on in Phase 13. Phase 13 is an *audit* of what should already be true.

### 5.1 Authentication
- Phone OTP via Supabase Auth. OTPs are rate-limited (Supabase's built-in throttling, tightened further in Phase 13) to prevent SMS-bombing a phone number or brute-forcing a code.
- Session tokens (JWT) are stored using Expo's secure storage (`expo-secure-store`), never `AsyncStorage`, since AsyncStorage is unencrypted on the device.
- Role (`customer` / `partner` / `admin`) is stored server-side in `profiles.role` and read from the authenticated session — never passed as a parameter the client can set on a request.

### 5.2 Authorization (Row Level Security)
- RLS is enabled on every table from the migration that creates it. A table with RLS enabled and *no* policies is unreadable/unwritable by default — that's the safe starting state while a feature is mid-build, not a bug to "fix" by disabling RLS.
- The default posture per table:
  - `profiles`: a user reads/updates only their own row.
  - `shops` / `services` / `barbers`: public read for `approved` shops; write restricted to `owner_id = auth.uid()`.
  - `bookings` and everything hanging off a booking (`booking_services`, `booking_events`, `payments`, `booking_verifications`, `refunds`): readable only by the booking's `customer_id` or the owning shop's `owner_id`/staff; writable only through Edge Functions using the service-role key, not directly by clients.
  - `admin_audit_log`, `app_config`: admin-only, enforced both by RLS and by the admin Edge Functions checking `role = 'admin'` before writing.
- **RLS is verified, not assumed.** From Phase 4 onward, whenever a new table gets policies, test them by making a request *as a second, unrelated account* and confirming access is actually denied — not just by reading the policy SQL and believing it's correct.

### 5.3 Secrets management
- Razorpay key secret, Razorpay webhook secret, and the Supabase service-role key exist only as Supabase Edge Function environment variables (`supabase secrets set`). They are never committed to git, never referenced in any file under `app/`, `components/`, `features/`, or `lib/` that ships inside the Expo bundle.
- The Expo app only ever holds: the Supabase URL, the Supabase anon/public key, and the Razorpay *key id* (public, safe to expose — it identifies the account, it isn't a credential).
- `.env` files with real values are git-ignored; a `.env.example` with placeholder keys is committed so the shape of required config is documented.

### 5.4 Input validation
- Every Edge Function validates its input payload shape (a lightweight schema check — e.g. Zod, or hand-rolled checks for MVP simplicity) before touching the database. Reject with a 400 rather than letting a malformed payload reach a query.
- Every ID passed from the client (booking ID, shop ID, service ID) is re-resolved against the database inside the function and checked for ownership — never trusted as "this booking belongs to this user because the app said so."
- Amounts are never accepted from the client. An Edge Function that creates a payment order computes the amount itself from `services.price` / `bookings.final_amount` as stored server-side.

### 5.5 Webhook security
- Every webhook (`razorpay-webhook`, `refund-webhook`, and Route's payout webhook in Phase 10) verifies the Razorpay signature header against the raw request body using the webhook secret before doing anything else. An unsigned or badly-signed request is rejected with no side effects.
- Idempotency: each webhook records the external event id it has already processed (e.g. a `processed_webhook_events` table or a unique constraint on `razorpay_payment_id`/`razorpay_refund_id`) and short-circuits on a repeat delivery instead of reapplying the state change.
- Webhooks never trust the *type* of event blindly — they re-fetch or re-derive the booking/payment state needed to decide the next status, rather than applying whatever the payload claims wholesale.

### 5.6 Rate limiting & abuse prevention
- OTP requests: capped per phone number and per IP within a time window (Phase 1 gets the Supabase default; Phase 13 tightens this explicitly and adds a cooldown UI).
- Booking creation and payment order creation: rate-limited per user (Phase 13) to prevent a single account from spamming holds or Razorpay order creation.
- Verification code entry: `attempt_count` on `booking_verifications` locks out further attempts after a small fixed limit (e.g. 5), so a 6-digit code can't be brute-forced in the verification window.

### 5.7 Data privacy
- PII (phone number, name, precise address/lat-lng) is never sent to `analytics_events` (Phase 11) or third-party crash reporting (Phase 13) — only IDs and non-identifying properties.
- Verification codes are stored as a hash (`code_hash`), never plaintext, mirroring how a password would be handled.
- A basic privacy policy and terms of service (Phase 13) disclose what's collected and why, ahead of a Play Store listing that legally requires this.

### 5.8 Dependency & platform hygiene
- `npm audit` / Dependabot-style checks run periodically (manually for MVP, via CI once Phase 13's pipeline exists) — an on-demand check, not something to automate before there's a CI pipeline to run it in.
- Expo/React Native and Supabase JS client are kept on supported versions; breaking upgrades are done deliberately between phases, never mid-feature.

---

## 6. Testing strategy

GLIDE uses four layers of testing, introduced progressively as the stack gains the pieces they need — don't reach for a heavier layer than a phase warrants.

1. **Manual verification (every phase, from Phase 1).** The "Test:" line at the end of each phase below — the builder looks at the phone screen and the Supabase table editor and confirms behavior directly. This is the primary test method through the early phases because it's the fastest feedback loop for a solo, first-time dev.
2. **Automated unit tests (introduced Phase 4 onward, for logic that isn't trivial).** Plain business logic — price calculation, slot-collision checks, state-machine transition validity, refund policy math — gets a Jest test once it exists, so a later change can't silently break it. Not every function needs a unit test; UI components generally don't at MVP stage.
3. **Edge Function integration tests (introduced Phase 5 onward, once money is involved).** Each Edge Function that touches booking status or payment status gets at least one automated test that calls it against a real (test-mode) Supabase project and Razorpay test mode, asserting the resulting row states — because these are exactly the paths where a manual click-through is easy to fool yourself on (e.g. "it looked right" but the webhook actually fired twice).
4. **End-to-end scenario testing (concentrated in Phase 13, but the relevant slice runs after each phase it applies to).** The full matrix in Section 8 — concurrency races, timeouts, duplicate webhooks, RLS boundary checks — run manually or scripted against test accounts.

**Test data discipline:** seed/test data lives in Supabase's test-mode project state, is clearly named (`Test Shop 1`, phone numbers from a reserved test range), and is never mixed into what becomes the production dataset — when the project is ready to go live, a fresh production Supabase project is provisioned rather than "cleaning up" the dev one.

---

## 7. Environment setup (Phase 0)

- Install Node.js LTS, the Expo CLI, and Git.
- Use **Expo Go** on a physical Android phone for daily development. Install Android Studio only when `expo prebuild`/EAS build genuinely needs a native module Expo Go can't run.
- Use the hosted Supabase free tier, not a local Docker stack — running Postgres locally alongside Metro will strain 8 GB RAM.
- Create a Razorpay test-mode account early; stay on test keys through Phase 9.
- VS Code with the Expo/React Native/ESLint extensions.
- Git workflow: `main` is always deployable/demoable; work happens on short-lived feature branches named after the phase/feature (`phase-4-slot-booking`), merged back once that phase's test passes. Commit messages describe the feature, not "wip" / "fix" repeatedly.
- `supabase/migrations/` is initialized in Phase 1 and every schema change from then on is a new migration file, applied via the Supabase CLI (`supabase db push` or the dashboard's migration tool) — not a manual table-editor structural edit.

**Test:** `npx create-expo-app glide --template` runs, the app opens in Expo Go on your phone showing the default screen, and editing a line of text hot-reloads on the phone within a couple of seconds.

---

## 8. Build order — phases

Each phase below gives the AI enough to actually implement it: what screens exist, what the data looks like, what server logic is required, what security applies, what NOT to build yet, and how to verify it's done. Don't start a phase until the previous one's test passes.

---

### Phase 1 — Foundation & Auth

**Goal:** a working Expo project with real Supabase-backed phone login and role routing.

**Build:**
- Expo + TypeScript project, Expo Router, folder structure from Section 9.
- Supabase project: enable phone OTP auth.
- Tables: `profiles` (id, phone, full_name, photo_url, role — customer/partner/admin, created_at), `shops`, `services`, `barbers` created with their end-state fields (Section 10) but only populated/used as later phases need them.
- RLS on `profiles` from day one: a user can only read/update their own row.
- Screens: phone number entry → OTP entry → on success, insert/read the `profiles` row → route to `(customer)` or `(partner)` stack based on `role`.
- Role is set once at signup (a simple toggle "I'm a customer" / "I'm a shop" is enough for now — no fancy onboarding).
- Session token stored via `expo-secure-store`, not `AsyncStorage`.

**Security checklist for this phase:**
- RLS enabled on `profiles` with policies verified using a second test account (create two accounts, confirm account A cannot read/update account B's row via the client).
- OTP rate limiting is on (Supabase default is enough for now).
- No secrets in the Expo app beyond the Supabase URL + anon key.

**Testing for this phase:**
- Manual: enter a real number, receive OTP, verify it, land on a role-correct blank home screen, and confirm the row in `profiles` in the Supabase table editor has the right phone and role.
- Manual RLS check: log in as two different accounts and confirm account A's client cannot fetch account B's profile row.

**Don't build yet:** shop discovery, bookings, payments — this phase is only "can a real phone number log in and land on the correct empty home screen."

---

### Phase 2 — Customer discovery (read-only)

**Goal:** customer can browse real shops from the database.

**Build:**
- Seed 2–3 shops, a few services and barbers per shop directly in Supabase (table editor is fine for *seed data*, not structure — the tables themselves were created via migration in Phase 1).
- Screens: shop list (name, rating placeholder, distance placeholder), search/filter by name, shop profile screen showing services + barbers.
- Basic RLS: anyone authenticated can `SELECT` on `shops`/`services`/`barbers` where `status = 'approved'` (or just all rows for now if `status` doesn't exist yet — add the approval gate when Phase 3 introduces shop approval).
- Data fetched via Supabase client queries — no hardcoded mock arrays in the app.

**Security checklist for this phase:**
- Confirm the read policy doesn't accidentally expose unapproved/other partners' draft data once `status` exists.

**Testing for this phase:**
- Manual: the shop list, shop profile, and service/barber lists on screen exactly match what's in the Supabase tables — edit a row in the table editor and confirm the app reflects it after a refresh.

**Don't build yet:** any booking action, location-based search (a simple list is fine — real geolocation/radius filtering can wait until Instant Booking needs it in Phase 9).

---

### Phase 3 — Partner app basics

**Goal:** a shop owner can manage their own shop instead of you editing rows manually.

**Build:**
- Partner role routing (already exists from Phase 1) leads to a Partner stack: shop profile edit, services CRUD, barbers CRUD, working hours (a simple per-day open/close time, stored as `jsonb` on `shops.opening_hours`).
- `shops.status` field (`pending` / `approved`) — for now, just default new shops to `approved` manually in the table editor; real approval flow is Phase 12 (Admin).
- RLS: a partner can only `INSERT`/`UPDATE`/`DELETE` rows on `shops`/`services`/`barbers` where `shops.owner_id = auth.uid()`.
- Client-side + Postgres-level input validation on service price/duration (positive numbers, sane max duration) so a partner typo can't create a ₹0 or negative-price service.

**Security checklist for this phase:**
- Verify with two partner accounts that partner A truly cannot edit/delete partner B's shop, services, or barbers (not just that the UI doesn't show a button for it).

**Testing for this phase:**
- Manual: log in as a partner, add/edit a service, and immediately see it appear on the customer side (Phase 2 screens) without any manual database edit.
- Manual RLS check: partner A attempts (via a raw Supabase client call, not just the UI) to update partner B's shop and is rejected.

**Don't build yet:** bookings, availability logic beyond storing opening hours.

---

### Phase 4 — Slot Booking (no payment yet)

**Goal:** a customer can request a slot and a shop can accept/reject it — money comes later.

**Build:**
- New tables: `bookings` (id, customer_id, shop_id, barber_id, mode='slot', status, scheduled_at, service_amount, total_amount, slot_hold_expires_at, shop_response_expires_at, created_at, confirmed_at), `booking_services` (booking_id, service_id, price), `booking_events` (booking_id, status, actor_id, note, created_at) for an audit trail.
- Booking status values used in this phase: `draft → awaiting_shop → confirmed / rejected / expired`.
- Customer flow: choose shop → barber → service → date/time → server creates a `draft` booking with a temporary hold (`slot_hold_expires_at = now() + 10 min`) → moves to `awaiting_shop`.
- **Slot collision prevention:** the server must check for overlapping confirmed/held bookings for that barber+time in one transaction before creating the hold — never trust the client's "this slot looks free."
- Partner flow: sees incoming `awaiting_shop` bookings with a countdown; Accept → `confirmed`; Reject → `rejected` (+ `booking_events` row); no response before `shop_response_expires_at` → a scheduled job (`pg_cron` or a simple polling check for now) flips it to `expired`.
- Edge Functions introduced: `create-booking` (validates availability, creates the hold), `accept-booking`, `reject-booking`.

**Security checklist for this phase:**
- `create-booking`/`accept-booking`/`reject-booking` re-check ownership server-side (the caller is really the shop owner / the booking's customer) rather than trusting IDs in the payload.
- RLS on `bookings`/`booking_events`: customer sees only their own bookings; shop sees only bookings for their own `shop_id`; direct client `UPDATE` on `bookings.status` is blocked — only the Edge Functions (service role) can change it.

**Testing for this phase:**
- Automated: a unit test for the slot-collision check (two overlapping requests, only one should succeed) and for the state machine (no transition skips a state, e.g. `draft` can't jump straight to `confirmed`).
- Manual: from two separate accounts/devices, one books a slot, the other accepts or rejects, and both sides see the correct status update. Try booking the exact same barber+time slot from two accounts at once and confirm the second one is correctly blocked or queued, not silently double-booked.

**Don't build yet:** any payment, QR verification, Instant Booking, refunds — a rejected/expired booking in this phase just... ends, no money was ever involved.

---

### Phase 5 — Payments (Razorpay)

**Goal:** booking only becomes financially real after the shop accepts, and payment status is never trusted from the client.

**Build:**
- New tables: `payments` (id, booking_id, amount, razorpay_order_id, razorpay_payment_id, status, method, created_at, captured_at), and add `payment_status` to `bookings` (kept as a **separate column from `status`** — never merged).
- Flow becomes: shop accepts → booking status `awaiting_shop → payment_pending` → server creates a Razorpay order via `create-payment-order` Edge Function using the price it calculates itself (never the amount sent by the app) → customer completes Razorpay Checkout in-app → **the client-side success callback is only a UI hint, never a source of truth** → the real confirmation is the `razorpay-webhook` Edge Function receiving `payment.captured`.
- `razorpay-webhook` responsibilities: verify the Razorpay signature, look up the booking from the order id, verify the amount matches, check it hasn't already processed this event (idempotency — store processed `razorpay_payment_id`s), update `payments.status = captured`, then flip `bookings.status = confirmed`.
- Payment status values used from here: `created, pending, captured, failed`.
- Razorpay secret key and webhook secret live only in Supabase Edge Function environment variables, never in the Expo app.

**Security checklist for this phase:**
- Webhook signature verification is in place *before* any database write, on every webhook-receiving function.
- Idempotency table/constraint for processed payment events is in place and tested with a deliberate duplicate delivery.
- The amount charged is always the server-computed one; a modified/tampered client request can't change what Razorpay is asked to charge.

**Testing for this phase:**
- Automated: an integration test hitting `create-payment-order` and asserting the amount matches server-side calculation regardless of what (if anything) the test sends as an amount hint.
- Manual: complete one successful test-mode payment end to end and watch the booking flip to `confirmed`. Deliberately fail a payment (Razorpay test card for failure) and confirm the booking does **not** confirm and the slot hold is released. Manually resend the same webhook payload twice (Razorpay dashboard supports this in test mode) and confirm the booking doesn't get double-processed or duplicated.

**Don't build yet:** refunds, QR verification, payouts — a failed payment in this phase just releases the hold and shows "payment failed, try again."

---

### Phase 6 — Arrival verification (QR / 6-digit code)

**Goal:** a paid, confirmed booking still requires proving the right customer showed up before service can start.

**Build:**
- New table: `booking_verifications` (id, booking_id, code_hash, verification_method, expires_at, attempt_count, verified_by, verified_at, created_at).
- New booking statuses: `confirmed → customer_arrived → verification_pending → verified → in_service → completed`.
- On the customer's appointment screen: an "I'm here" button (enabled only once `scheduled_at` is close) generates a short-lived, single-use 6-digit code server-side (`generate-service-code` Edge Function) — store only its hash, never the plaintext, and render it as both a QR code and the digits.
- Partner screen: scan QR or type the code → `verify-arrival` Edge Function checks: booking belongs to this shop, payment is `captured`, code matches the hash, code hasn't expired, code hasn't already been used, attempt count is under the limit → on success sets `verification_status = verified` and unlocks "Start Service."
- `start-service` Edge Function checks `verification_status = verified` and `payment_status = captured` before allowing `in_service`. `complete-booking` Edge Function moves `in_service → completed` and stamps `completed_at`.

**Security checklist for this phase:**
- `attempt_count` genuinely locks out further tries after the limit — test this, don't just implement it.
- Code hash comparison uses a constant-time-safe approach appropriate for a 6-digit space (rate limiting matters more than exotic timing-attack defenses here, but attempt-count lockout is mandatory).

**Testing for this phase:**
- Manual: correct code works exactly once; using it again fails; letting it expire fails; entering it against the wrong shop or wrong booking fails; confirm "Start Service" is genuinely disabled until verification succeeds, not just hidden in the UI (try calling the Edge Function directly with an unverified booking id).

**Don't build yet:** refunds, notifications infrastructure, Instant Booking, payouts.

---

### Phase 7 — Cancellations & automatic refunds

**Goal:** every normal cancellation/refund path resolves itself with no admin involved.

**Build:**
- New table: `refunds` (id, payment_id, amount, reason, razorpay_refund_id, status, created_at). Payment status gains `refund_pending, refunded, partially_refunded`.
- New table: `app_config` (key, value jsonb) — store the cancellation policy here (e.g. `{"customer_cancel_full_refund_minutes": 60}`), not hardcoded in app logic, so it can change without a new app release.
- Automatic refund triggers, each calling a `process-refund` Edge Function that hits the Razorpay Refund API: shop rejects after payment, shop doesn't respond in time, eligible customer cancellation per policy, any system-side booking failure after payment.
- `refund-webhook` Edge Function reconciles the actual Razorpay refund status into `refunds.status` and `payments.status` — same idempotency pattern as Phase 5's payment webhook. Never mark a refund "done" just because the API call returned 200; wait for the webhook.
- Add a `cancel-booking` Edge Function that customers/partners call, which checks the policy in `app_config` and either triggers a full/partial refund or none.

**Security checklist for this phase:**
- `cancel-booking` re-verifies the caller is actually the booking's customer or the owning shop before evaluating policy — never trust a `booking_id` alone.
- Refund amount is computed server-side from the policy + original payment, never from a client-supplied refund amount.

**Testing for this phase:**
- Automated: unit test the refund-policy calculation (inside vs. outside the free window, partial vs. full).
- Manual: trigger a shop-rejects-after-payment refund, a shop-timeout refund, and a customer cancellation both inside and outside the free-refund window — confirm each one actually completes in Razorpay test mode and the local `refunds`/`payments` rows end up correct. Resend a refund webhook twice and confirm no double-processing.

**Don't build yet:** payouts (Phase 10) — refunds in this phase only need to work against the customer's original payment, not against money already sent to a shop.

---

### Phase 8 — Notifications

**Goal:** both sides see status changes live, without pulling to refresh, and get push notifications when the app is backgrounded.

**Build:**
- New tables: `notifications` (id, user_id, type, title, body, data jsonb, read_at, created_at), `device_tokens` (user_id, expo_token, updated_at).
- Register the Expo push token on login, store it in `device_tokens`.
- Use Supabase Realtime subscriptions on `bookings` (filtered to the relevant customer/shop) so the UI updates live while the app is open.
- A `send-notification` Edge Function is called from the relevant points in earlier phases (booking accepted/rejected, payment captured, verification ready, service completed, refund completed) to insert a `notifications` row and fire an Expo push.
- A scheduled job sends booking reminders (24h / 2h / 30min before `scheduled_at`).

**Security checklist for this phase:**
- RLS on `notifications`/`device_tokens`: a user reads only their own rows.
- Push payloads never include PII beyond what's needed to deep-link to the right screen (booking id, type) — no phone numbers or addresses in the push body.

**Testing for this phase:**
- Manual: with two devices open on the relevant screens, trigger a status change (e.g. partner accepts) and confirm the customer's screen updates within a couple of seconds with no manual refresh, and that backgrounding the app still delivers a push notification.
- Manual: confirm a notification failure (e.g. invalid/stale Expo token) doesn't throw an error back to the booking flow — it should fail silently from the user's perspective and just not deliver that one push.

**Don't build yet:** Instant Booking notifications specifically (those come with Phase 9, reusing this same infrastructure).

---

### Phase 9 — Instant Booking

**Goal:** the "book now" flow, built on top of everything above.

**Build:**
- New table: `booking_offers` (id, booking_id, shop_id, offered_at, responded_at, response) to track the broadcast.
- `bookings.mode = 'instant'`, new status `broadcasting`, plus `max_price`, `final_amount`, `broadcast_radius_km`, `broadcast_expires_at`.
- Eligibility query for "which shops get this request": approved, open, `accepts_instant = true`, within a configured radius (basic lat/lng distance check is fine for MVP — no need for a mapping SDK yet), offers the requested service(s), service price ≤ customer's max price. Recommended gate: only show "Book Instantly" if 3+ eligible shops exist, otherwise fall back to the normal shop list.
- `create-instant-booking` Edge Function: creates the booking in `broadcasting`, inserts a `booking_offers` row per eligible shop, pushes a high-priority notification to each.
- **Atomic first-accept-wins**, the critical piece — a single conditional `UPDATE` that only succeeds for the first shop to hit it:
  ```sql
  UPDATE bookings
  SET status = 'payment_pending', shop_id = :shop_id
  WHERE id = :booking_id
    AND status = 'broadcasting'
    AND broadcast_expires_at > now()
  RETURNING *;
  ```
  If zero rows return, that shop already lost — show "offer taken."
- Winning shop's actual price becomes `final_amount`; the Phase 5 payment flow runs against that exact amount (no charge-then-refund-the-difference — the correction from earlier drafts of this doc has been folded in: don't charge until the price is locked).
- If nobody accepts before `broadcast_expires_at`: status → `no_partner_found`, customer sees the normal shop list, no payment was ever taken so no refund is needed.

**Security checklist for this phase:**
- The atomic `UPDATE ... WHERE status = 'broadcasting'` runs inside the Edge Function using the service-role key — a shop's client can never race this by calling `UPDATE` directly, because clients can't write to `bookings` at all (Phase 4's RLS rule holds).
- Eligibility filtering happens server-side; a shop can't fabricate eligibility for a broadcast it wasn't actually offered.

**Testing for this phase:**
- Automated: a concurrency test that fires the accept Edge Function from two simulated shops at once and asserts exactly one `RETURNING` row comes back.
- Manual: fire two "accept" requests from two different shop accounts for the same instant booking as close together as you can manage and confirm only one wins the atomic update; the other must see "already taken," not a confirmed booking. Also test zero eligible shops (falls back to shop list) and a broadcast timing out with no acceptance.

**Don't build yet:** Route payouts, analytics dashboards — this phase is purely the broadcast/race-condition logic plus reusing Phases 5, 6, 8 for payment/verification/notifications.

---

### Phase 10 — Razorpay Route payouts

**Goal:** shops get paid automatically after completed service, without you manually transferring money.

**Build:**
- Add to `shops`: `razorpay_account_id`, `razorpay_account_status`, `razorpay_onboarding_status`.
- New table: `shop_earnings` (id, booking_id, shop_id, gross_amount, commission, net_amount, razorpay_account_id, razorpay_transfer_id, payout_status, eligible_at, transferred_at).
- Onboarding: when admin approves a shop for payouts, create a Razorpay Linked Account for it and walk the partner through submitting business/bank/KYC details (this is largely a Razorpay-hosted flow — the app just needs to store the resulting account id/status).
- Payout timing rule: only becomes eligible **after** `bookings.status = completed` — never before, so a shop is never paid for a service that didn't happen.
- `create-route-transfer` Edge Function fires on booking completion, calculates commission split, creates the Razorpay transfer.
- `route-webhook` reconciles transfer success/failure into `shop_earnings.payout_status`. A failed transfer must never change the customer-facing booking status — it only affects the shop's payout record, with a retry/admin-alert path.

**Security checklist for this phase:**
- KYC/bank details are handled entirely by Razorpay's hosted onboarding — GLIDE never stores raw bank account numbers itself.
- The commission split calculation lives server-side and reads `shops.commission_pct`/`app_config`, never a client-supplied value.

**Testing for this phase:**
- Manual: complete a booking end to end and confirm a correctly-split transfer appears in Razorpay Route test mode; deliberately break a transfer (e.g. incomplete Linked Account) and confirm the customer's booking still shows `completed` correctly regardless.

**Don't build yet:** full analytics, admin dashboard UI for this (Phase 11/12 add the dashboards; this phase is the transfer mechanics).

---

### Phase 11 — Analytics

**Goal:** enough visibility to understand what's happening in the business, without analytics ever being able to block a real transaction.

**Build:**
- New table: `analytics_events` (id, user_id, session_id, event_name, booking_id, shop_id, properties jsonb, created_at).
- A `track-analytics-event` Edge Function (or direct insert with light RLS) called at the key points already built in earlier phases: `booking_created`, `payment_success`, `payment_failed`, `booking_confirmed`, `service_verified`, `service_completed`, `refund_completed`, `instant_requested`, `instant_offer_accepted`.
- A simple funnel view (can be a basic SQL query/admin screen, not a fancy BI tool yet): app opened → shop viewed → booking created → shop accepted → payment successful → booking confirmed → verified → completed.
- Never send OTPs, payment secrets, or card data into analytics events; never send raw phone numbers, names, or addresses either — only IDs and category-level properties.

**Testing for this phase:**
- Manual: disable/break the analytics insert on purpose (e.g. point it at a nonexistent table temporarily) and confirm a booking still completes normally — analytics failing must never surface as a user-facing error or block a transaction. Wrap the analytics call in a try/catch that swallows and logs, never one that propagates.

**Don't build yet:** a polished dashboard UI — that's part of Phase 12's admin panel.

---

### Phase 12 — Admin dashboard

**Goal:** a small web app (Next.js is fine) for the operational exceptions, not routine approvals.

**Build:**
- New table: `admin_audit_log` (id, admin_id, action, target_type, target_id, before jsonb, after jsonb, reason, created_at) — every admin mutation writes here.
- Sections: shop approvals, customer/booking search, payments & refunds visibility, shop earnings, disputes, configuration (the `app_config` values from Phase 7, Instant Booking radius/timeouts from Phase 9), and the analytics views from Phase 11.
- All admin writes go through server-side functions that check `role = 'admin'` and log to `admin_audit_log` — never direct table edits from the dashboard client.

**Security checklist for this phase:**
- Admin dashboard auth is separate/hardened (e.g. still Supabase Auth, but admin routes double-check `role = 'admin'` server-side on every request, not just at login).
- Every admin mutation is logged with accurate before/after state before the change is confirmed to the admin user.

**Testing for this phase:**
- Manual: every admin action (approve a shop, adjust a config value, resolve a dispute) produces a correct `admin_audit_log` row with accurate before/after values.

**Don't build yet:** anything beyond what's needed to operate what's already built — this phase is UI over the data model that already exists, not new product logic.

---

### Phase 13 — Hardening & release prep

**Goal:** ready for real users on the Play Store.

**Build:**
- Full RLS audit across every table — confirm a customer genuinely cannot read another customer's booking, and a partner genuinely cannot act on another shop's booking (test this directly with the Supabase client using a second account, not just by reading the policy code).
- Rate limiting on OTP requests, booking creation, and payment order creation.
- Dependency audit (`npm audit`, review of Supabase/Expo advisories).
- Run the full scenario matrix in Section 11.
- Crash monitoring (Sentry or similar) with PII scrubbing confirmed, database backup confirmation (Supabase automatic backups enabled and a manual restore test performed at least once).
- Basic CI: lint + typecheck + unit tests running on every push (GitHub Actions is fine), before EAS builds are trusted for release.
- Play Store: privacy policy, terms & conditions, cancellation/refund policy pages, closed testing group of real testers before production release.

**Test:** the entire matrix in Section 11 passes, and a fresh tester with no prior context can install via the closed testing link and complete one full booking end to end unassisted.

---

## 9. Project structure (target end-state)

```
glide/
├── app/                     # Expo Router screens
│   ├── (auth)/
│   ├── (customer)/
│   └── (partner)/
├── components/
├── features/
│   ├── auth/                # Phase 1
│   ├── bookings/            # Phase 4
│   ├── payments/            # Phase 5
│   ├── verification/        # Phase 6
│   ├── notifications/       # Phase 8
│   ├── instant/             # Phase 9
│   └── analytics/           # Phase 11
├── lib/
│   ├── supabase/
│   ├── razorpay/
│   └── validation/
├── supabase/
│   ├── migrations/          # every schema change, from Phase 1 onward
│   └── functions/           # Edge Functions, added per phase:
│       ├── create-booking/          # Phase 4
│       ├── accept-booking/          # Phase 4
│       ├── reject-booking/          # Phase 4
│       ├── create-payment-order/    # Phase 5
│       ├── razorpay-webhook/        # Phase 5
│       ├── generate-service-code/   # Phase 6
│       ├── verify-arrival/          # Phase 6
│       ├── start-service/           # Phase 6
│       ├── complete-booking/        # Phase 6
│       ├── process-refund/          # Phase 7
│       ├── refund-webhook/          # Phase 7
│       ├── cancel-booking/          # Phase 7
│       ├── send-notification/       # Phase 8
│       ├── create-instant-booking/  # Phase 9
│       ├── create-route-transfer/   # Phase 10
│       ├── route-webhook/           # Phase 10
│       ├── track-analytics-event/   # Phase 11
│       └── admin-action/            # Phase 12
├── __tests__/                # Jest unit/integration tests, Phase 4 onward
└── admin/                   # Phase 12, Next.js
```

Create folders as their phase arrives — an empty `features/instant/` sitting there from Phase 1 is clutter, not future-proofing.

---

## 10. Database schema — introduced phase by phase

Use these names/fields from the start so nothing needs renaming later; only create a table/column when its phase actually arrives. Every table gets RLS enabled in the same migration that creates it.

| Table | Introduced in | Key fields |
|---|---|---|
| profiles | Phase 1 | id, phone, full_name, photo_url, role, created_at |
| shops | Phase 1 | id, owner_id, name, address, lat, lng, opening_hours, status, is_open, commission_pct |
| services | Phase 1 | id, shop_id, name, price, duration_min, is_active |
| barbers | Phase 1 | id, shop_id, name, is_active |
| bookings | Phase 4 | id, customer_id, shop_id, barber_id, mode, status, scheduled_at, service_amount, total_amount, slot_hold_expires_at, shop_response_expires_at |
| booking_services | Phase 4 | booking_id, service_id, price |
| booking_events | Phase 4 | booking_id, status, actor_id, note, created_at |
| payments | Phase 5 | id, booking_id, amount, razorpay_order_id, razorpay_payment_id, status, captured_at |
| booking_verifications | Phase 6 | id, booking_id, code_hash, verification_method, expires_at, attempt_count, verified_at |
| refunds | Phase 7 | id, payment_id, amount, reason, razorpay_refund_id, status |
| app_config | Phase 7 | key, value (jsonb) |
| notifications | Phase 8 | id, user_id, type, title, body, data, read_at |
| device_tokens | Phase 8 | user_id, expo_token, updated_at |
| booking_offers | Phase 9 | id, booking_id, shop_id, offered_at, responded_at, response |
| shop_earnings | Phase 10 | id, booking_id, shop_id, gross_amount, commission, net_amount, razorpay_transfer_id, payout_status |
| analytics_events | Phase 11 | id, user_id, session_id, event_name, booking_id, shop_id, properties, created_at |
| admin_audit_log | Phase 12 | id, admin_id, action, target_type, target_id, before, after, reason |
| reviews | Phase 6 (schema) | id, booking_id, customer_id, shop_id, barber_id, rating, comment |

**Booking status values** (introduced progressively): `draft, awaiting_shop, payment_pending, broadcasting, confirmed, customer_arrived, verification_pending, verified, in_service, completed, rejected, cancelled_by_customer, cancelled_by_shop, shop_response_expired, no_partner_found, expired, no_show`.

**Payment status values** (from Phase 5): `created, pending, captured, failed, refund_pending, refunded, partially_refunded`.

**Rules to keep this future-proof:**
- `bookings.status` and `payments.status` are always separate columns — never merge them into one field.
- Money columns are stored as integer paise (not floating point rupees) to avoid rounding errors — this matches how Razorpay's API represents amounts natively.
- Every table with a lifecycle (bookings, payments, refunds, shop_earnings) has `created_at`, and the specific timestamp columns for its key transitions (e.g. `captured_at`, `verified_at`, `completed_at`) rather than relying on `booking_events`/logs alone to answer "when did X happen."

---

## 11. Testing scenario matrix (run fully in Phase 13, partially after each relevant phase)

- Two users trying to book the same slot at once.
- Shop rejects a booking / shop never responds (timeout).
- Payment fails, payment succeeds, duplicate webhook delivery.
- App closed mid-checkout, then reopened.
- Wrong / expired / reused verification code.
- Verification code brute-force attempt (confirm lockout after the attempt limit).
- Two shops accepting the same Instant Booking simultaneously.
- No eligible shops for Instant Booking.
- Refund after a shop has already been paid out.
- A customer trying to read another customer's booking (RLS check).
- A partner trying to act on another shop's booking (RLS check).
- A partner or customer attempting to call a state-changing Edge Function (e.g. `verify-arrival`, `accept-booking`) directly with someone else's booking id.
- Analytics or push notification service being unreachable — confirm bookings/payments still complete.
- Device offline mid-flow (booking creation, payment) — confirm no partial/inconsistent state on reconnect.
- Clock skew / server time vs. device time for expiry-based logic (`slot_hold_expires_at`, `broadcast_expires_at`) — confirm expiry is always evaluated server-side, never trusting device time.

---

## 12. How to use this document

- Give this whole document to your AI assistant at the start of a session, or reference "GLIDE Phase N" once it's already seen it.
- At the start of each session, tell the AI which phase you're on and what's already done.
- Don't ask for "the whole app" — ask for the current phase, one step inside it at a time.
- After each phase's test passes (including its security checklist and testing items), come back here, mark it done, and move to the next one.

---

## 13. Ground-reality backlog — operational scenarios mapped to phases

**Why this section exists:** a batch of real-world operational scenarios (barber behavior, walk-in collisions, network dead zones, dispute handling, launch density, fraud vectors) was reviewed against the roadmap above. Per Section 2's rules — one phase at a time, no later-phase leakage, "when scope is unclear, build less and ask" — none of these are built early just because they were identified early. Each is instead pinned to the exact phase it belongs to, as a concrete addition to that phase's `Build:` list, so it lands automatically when that phase starts instead of being rediscovered as a surprise later. **At the start of each phase, re-read this section's entries for that phase before writing the `Build:` list into actual tasks.**

### Pinned to phases already in the roadmap

- **Phase 3 (Partner app basics):** the shop profile edit screen must expose `shops.is_open` as a prominent, one-tap toggle (not buried in a settings form) — this is the "emergency pause" a shop needs for a power cut, equipment failure, or any reason it must stop new bookings without deleting its profile. The schema already supports this; it's a UI-prominence decision, not a schema change. **Barber account model decision:** `barbers` rows stay owner-managed records (name, active flag) with no individual login for employee barbers in the MVP — verification/accept actions happen from the shop owner's single Partner-app session (e.g. left logged in on a shared shop device during hours). A per-barber login/kiosk-PIN mode is explicitly deferred, not silently built, if it turns out employees need to act without the owner's phone.
- **Phase 4 (Slot Booking):** barber-busy reality — the shop's response window (`shop_response_expires_at`) should default long enough (target ~90–120s, confirm with the builder) for someone mid-haircut to notice and respond, and the partner accept alert should be loud/persistent (sound, not just a silent badge), not just an inbox item. Late-arrival handling — a customer more than a fixed grace period late (start at 10 min) without tapping "running late" in-app risks the slot per the Phase 7 cancellation policy; "running late" itself is a small booking-events note, not a new status. Multi-service slot math — the collision check should add a small buffer (5–10 min) between back-to-back multi-service bookings for the same barber, not just butt them end to end. Mid-service amendment — a barber adding a service at the chair (e.g. beard trim added to a haircut) needs a Phase-4/6-boundary "amend booking" path that re-checks the next booking's start time and warns if it no longer fits; this is new scope versus the original spec and should be scoped small (append a service, recompute `total_amount`, block if it collides) rather than becoming a general rebooking feature.
- **Phase 6 (Verification):** network-dead-zone reality — basement/concrete-wall shops routinely lose 4G. Design `generate-service-code` so the code (and its QR rendering) can be fetched once with margin before arrival and displayed from local state/cache, and the 6-digit fallback must not itself require a live network call to *display* (only `verify-arrival`, run from the partner's device, needs connectivity — that side usually has better signal than deep in a basement). Don't build an offline-verifiable code scheme (e.g. TOTP) unless the plain cache-and-display approach proves insufficient in testing — start with the simpler fix.
- **Phase 7 (Cancellations & refunds):** the no-show/late-cancellation split (e.g. 30% fee retained, most of it passed to the shop) and the grace-period minutes are exactly what `app_config` was designed for — store them there, not hardcoded, and confirm actual percentages with the builder before launch rather than guessing. Partial-completion refunds (customer leaves mid-package, e.g. gets the haircut but not the paid facial) need a "revise remaining amount" path in `process-refund` beyond simple full-refund policy math — scope it as a manual partner-entered revised amount that triggers a partial refund, not automatic detection of what was actually performed.
- **Phase 8 (Notifications):** service-running-over reality — a partner-side "+10 min" button that pushes a heads-up to the next booked customer is a small, valuable addition to the notification triggers already planned for this phase.
- **Phase 9 (Instant Booking):** preferred-barber reality — customers are loyal to a specific barber, not just a shop; since `bookings.barber_id` and `barbers` already exist from Phase 1, make sure instant-booking eligibility/offer logic accounts for a customer's requested barber being unavailable and prompts a reschedule/switch rather than silently reassigning.
- **Phase 10 (Payouts):** cash-flow reality — small shop owners need money same-day, not weekly; target **daily** automated payouts (e.g. every evening) rather than a longer default cycle. KYC friction reality — some shops won't clear Razorpay Route's formal KYC (no GST, informal bank docs); plan a fallback manual/batch UPI payout path for those shops rather than blocking them from payouts entirely until Route onboarding clears.
- **Phase 13 (Hardening):** dispute-handling reality — Terms of Service must state plainly that once arrival is verified and service starts, payment is non-refundable for aesthetic/subjective dissatisfaction (disputes go through shop-credit/manual resolution, not chargebacks). Fraud reality — cap new accounts to a small number of simultaneous pending bookings (start at 2) to blunt competitor-sabotage-style slot-hoarding, in addition to the rate limiting already planned.

### Not yet in the roadmap — needs an explicit decision, not a silent addition

These came up in the ground-reality review but aren't small additions to an existing phase; they're new feature areas. Per Section 2 rule 10, they stay **out of scope until the builder explicitly decides to add them as a phase**, rather than getting built opportunistically:

1. **Loyalty/retention program** (in-app cashback or "Nth visit free" to counter off-platform leakage where a shop tries to move a repeat customer to direct WhatsApp booking).
2. **Time-based dynamic pricing** (weekday off-peak discount vs. weekend peak price) — changes the price-calculation logic non-trivially, so it needs deliberate design, not a quick `app_config` add.
3. **Promo/referral system with fraud controls** (device/IP tracking, minimum transaction thresholds) — no promo mechanism exists yet at all, so this is a new feature, not a hardening add-on.
4. **Shop monetization beyond commission** (featured/boosted listings, paid SaaS-style tools like client SMS marketing) — a business-model decision, not just a technical one.

**Go-to-market note (not app scope, operational strategy):** launch in one dense micro-market (10–15 shops within ~1.5–2 km, e.g. one campus/township) before expanding city-wide, so the shop list is never sparse for an early user. This doesn't affect the build order above — it's a decision for when the app is ready to onboard real shops.
