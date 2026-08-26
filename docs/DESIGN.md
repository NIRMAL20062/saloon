# GLIDE — System Design

**Architecture, UI/UX, and Security & Safety reference for the whole app.**

This document is a companion to [`CLAUDE.md`](../CLAUDE.md) (the phase-by-phase build plan and AI working rules) and [`AGENTS.md`](../AGENTS.md). CLAUDE.md says *what to build, in what order, and how to verify it*. This document says *how the finished system is shaped* — the architecture, the screen-by-screen UX, the security model, and how each component works end to end — so any session can orient without re-deriving the whole product from scratch.

**Nothing here changes CLAUDE.md's rules.** In particular: build one phase at a time, don't pull a later-phase table/screen/field forward because this document describes it, and treat any conflict between this document and CLAUDE.md as a bug in this document — CLAUDE.md wins.

**Status as of writing:** Phase 1 (auth) and Phase 2 (customer discovery) are built. Phase 3 (partner shop/service management) is in progress — shop profile edit and services CRUD exist; barbers CRUD and the `is_open` toggle are still open. Everything from Phase 4 onward (bookings, payments, verification, refunds, notifications, instant booking, payouts, analytics, admin) is design-only — described here for shape and consistency, not yet implemented.

---

## 1. Product summary

GLIDE is an on-demand barber & salon booking app for Android with two booking modes — **Slot Booking** (pick a shop/barber/service/time) and **Instant Booking** (request now, nearest eligible shop to accept wins). A booking only becomes real once three independent things line up automatically, with no human in the loop:

```
SHOP ACCEPTS  +  CUSTOMER PAYS  +  CUSTOMER VERIFIED ON ARRIVAL
                        ↓
                "START SERVICE" UNLOCKS
```

Three surfaces share one Supabase backend: the **Customer app**, the **Partner app** (same Expo codebase, role-routed), and a **web Admin dashboard** (Phase 12) for exceptions and configuration only — never routine approvals. Full persona and rationale detail lives in CLAUDE.md §1; it isn't repeated here.

---

## 2. Architecture

### 2.1 System diagram

```
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
│    Customer App       │        │    Partner App         │        │   Admin Dashboard      │
│  Expo / Android        │        │  Expo / Android          │        │  Next.js, web (Ph.12)  │
│  role = customer        │        │  role = partner            │        │  role = admin            │
└───────────┬───────────┘        └───────────┬───────────┘        └───────────┬───────────┘
            │  Supabase JS client (anon key, RLS-scoped reads + Edge Function calls)
            ▼                                ▼                                ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                                    Supabase project                                     │
│                                                                                           │
│   ┌────────────────┐   ┌──────────────────┐   ┌───────────────────────────────────┐    │
│   │   Postgres +     │   │  Auth (phone OTP)  │   │   Realtime (Postgres changefeed)   │    │
│   │   Row Level        │   │                       │   │   → live booking/status updates     │    │
│   │   Security          │   │                       │   │                                       │    │
│   └────────────────┘   └──────────────────┘   └───────────────────────────────────┘    │
│                                                                                           │
│   ┌───────────────────────────────────────────────────────────────────────────────┐    │
│   │  Edge Functions (Deno) — the ONLY place that:                                    │    │
│   │   • holds the Razorpay secret key and Supabase service-role key                    │    │
│   │   • computes prices, sets bookings.status / payments.status                        │    │
│   │   • verifies webhook signatures before any write                                    │    │
│   │   • re-validates every client-supplied id (booking/shop/service) against the DB      │    │
│   └───────────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │  server-to-server only — secret keys live here
                                        ▼
                          ┌─────────────────────────────┐
                          │           Razorpay             │
                          │  Orders · Payments · Refunds ·   │
                          │  Route (payouts)                   │
                          └─────────────────────────────┘
```

### 2.2 The trust boundary, stated plainly

The Expo app — customer or partner — is **never** trusted to compute a price, set a booking or payment status, or decide a booking outcome. It can only:

1. **Read** whatever Row Level Security (RLS) allows it to read, directly via the Supabase client.
2. **Call an Edge Function** and react to what that function returns.

Every Edge Function re-validates its own inputs against the database — it never assumes a client-supplied booking id, shop id, or amount is honest. This is why the architecture centers Edge Functions rather than letting the app `UPDATE` tables directly for anything that touches money or booking state: RLS controls *row access* ("can this user touch this row at all"), not *business rules* ("is this a legal state transition", "does this price match reality"). Only server-side code — running with the service-role key, after doing its own checks — is allowed to make those calls. Full rationale in CLAUDE.md §4.1.

### 2.3 Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Mobile client | Expo SDK 54 (React Native 0.81, TypeScript, Expo Router 6) | One codebase, role-routed between customer and partner stacks |
| Backend | Supabase (Postgres, Auth, RLS, Realtime, Edge Functions) | Hosted free tier during dev — no local Docker, keeps the 8 GB dev machine light |
| Payments | Razorpay (Orders, Checkout, Webhooks, Refunds, Route) | Test-mode keys through Phase 9 |
| Admin web | Next.js | Phase 12 only |
| Session storage | `expo-secure-store` | Encrypted; never `AsyncStorage` |
| Push notifications | Expo push service | Phase 8 |

### 2.4 Data flow — two worked examples

**Slot booking, happy path** (Phases 4–6):
`customer picks shop/barber/service/time` → `create-booking` Edge Function checks for overlapping bookings for that barber+time, creates a `draft` row with a 10-minute hold, flips to `awaiting_shop` → shop's Partner app shows it with a countdown → `accept-booking` flips it to `payment_pending` → `create-payment-order` computes the price server-side and opens Razorpay Checkout → customer pays → **`razorpay-webhook`** (not the client success callback) verifies the signature, matches the amount, and flips `payments.status = captured` + `bookings.status = confirmed` → on arrival, `generate-service-code` issues a hashed one-time code → partner runs `verify-arrival` → `start-service` → `complete-booking`.

**Instant booking, happy path** (Phase 9, layered on the above):
`customer requests now` → `create-instant-booking` finds eligible shops (approved, open, accepts instant, in radius, offers the service, price ≤ customer's max) and broadcasts → each shop's accept action races a single atomic conditional `UPDATE ... WHERE status = 'broadcasting'`, so only the first acceptance wins and everyone else sees "offer taken" → the winning shop's price becomes `final_amount` → the same Phase 5/6 payment and verification flow runs against that locked price.

In both flows, notice the pattern that repeats everywhere in this system: **client requests → Edge Function decides and re-checks → webhook or atomic query is the actual source of truth → client just reflects what Realtime/polling tells it.** The client's job is display and input collection, never decision-making.

### 2.5 Repo layout & current status

```
app/
├── (auth)/            phone.tsx, verify.tsx — ✅ built
├── (customer)/         index.tsx (shop list), shop/[id] — ✅ built (Phase 2)
└── (partner)/          index.tsx, services.tsx — 🚧 in progress (Phase 3)
features/
├── auth/               otp.ts, auth-provider.tsx, dev-accounts.ts — ✅ built
└── shops/               api.ts (customer read), partner-api.ts (partner write), geo.ts — ✅ built
lib/supabase/client.ts   — ✅ built
supabase/migrations/     0001_init, 0002_customer_discovery_read, 0003_partner_shop_write,
                          0004_partner_services_write — ✅ applied
```

Folders for `features/bookings/`, `features/payments/`, `features/verification/`, `features/notifications/`, `features/instant/`, `features/analytics/`, and `supabase/functions/*` don't exist yet — per CLAUDE.md §2 rule 9, they get created when their phase starts, not now. See CLAUDE.md §9 for the full target tree.

---

## 3. UI/UX design

### 3.1 Design system

Current tokens live in [`constants/theme.ts`](../constants/theme.ts): a light/dark color palette (`Colors.light` / `Colors.dark`, including a brand `tint` — indigo — plus semantic `success`/`warning`/`danger` colors and `surface`/`tintSurface` tones for cards and icon chips), a 4px `Spacing` scale, a `Radius` scale, and a `Shadow.card` elevation preset, alongside a platform-aware font stack (`Fonts`). Shared primitives in [`components/`](../components/): `themed-view`, `themed-text` (including a `caption` type for muted secondary text), `themed-text-input`, `button` (primary/secondary/danger variants, loading state, haptic tap), `card` (optionally pressable), `badge` (status pills — success/warning/danger/neutral), `screen` (safe-area wrapper), `parallax-scroll-view`, `haptic-tab`. New screens should compose these rather than reach for raw RN `View`/`Text`/`TextInput`/`Pressable`-as-button, so theming, spacing, and status-display stay consistent app-wide. The native navigation theme (`app/_layout.tsx`) is built from the same `Colors` tokens, so headers and any un-themed screen background match too.

Design principles for GLIDE specifically:

- **Status is always visible, never inferred.** A booking's state (`awaiting_shop`, `confirmed`, `payment_pending`, …) is rendered as an explicit, human-readable label/badge everywhere it appears — list rows, detail screens, notifications — because the whole product's trust promise depends on the user always knowing exactly where a booking stands.
- **Money and time commitments are never ambiguous.** Prices are shown in ₹ with no floating-point surprises (server stores paise, UI always formats to rupees before display). Countdowns (shop response window, slot hold, verification code expiry) render as a live ticking timer, not a static "expires soon."
- **The three-condition promise is shown, not just enforced.** Wherever it's relevant (e.g. the booking detail screen), a simple three-step tracker — Shop accepted → Paid → Verified — gives the user a mental model that matches the backend state machine.
- **Errors are actionable, not just red text.** "Payment failed — try again" plus a retry button, not a bare error string. Server-side rejections (slot taken, offer already accepted) get a specific message, not a generic failure.

### 3.2 Navigation structure

Expo Router file-based routing, three top-level groups gated by `profiles.role` read from the authenticated session (never a client-supplied parameter):

```
/(auth)/phone → /(auth)/verify → [role lookup] → /(customer)/… or /(partner)/…
```

- `(auth)` — phone entry, OTP entry. No role yet; unauthenticated.
- `(customer)` — the customer stack (tab or stack navigator per phase's needs).
- `(partner)` — the partner stack.
- `admin` (Phase 12) — a separate Next.js app, not part of this Expo Router tree at all.

A user who is authenticated but has no `profiles` row yet (first login) is routed to a minimal role-selection step ("I'm a customer" / "I'm a shop") before landing in either stack — this is Phase 1's whole onboarding, deliberately not fancier than that.

### 3.3 Customer app — screen by screen

| Screen | Phase | Purpose | Key states |
|---|---|---|---|
| Phone entry | 1 | Enter phone number, request OTP | idle, sending, rate-limited |
| OTP verify | 1 | Enter 6-digit code, create/read session | idle, verifying, wrong code, expired |
| Role select (first login only) | 1 | Customer vs partner, one time | — |
| Shop list | 2 | Browse approved shops: name, rating placeholder, distance | loading, empty, populated, pull-to-refresh |
| Search / filter | 2 | Filter shop list by name | — |
| Shop profile | 2 | Shop detail: services, barbers, hours | loading, populated |
| Slot booking flow | 4 | Pick barber → service(s) → date/time → confirm hold | selecting, holding (10 min countdown), awaiting shop, confirmed, rejected, expired |
| Instant booking ("Book now") | 9 | One-tap request; only offered if ≥3 eligible shops nearby, else falls back to shop list | broadcasting (live countdown), offer accepted, no partner found |
| Payment (Razorpay Checkout) | 5 | In-app checkout once shop accepts | pending, processing, failed→retry, captured (via webhook confirmation, not the client callback) |
| Booking detail | 4–6 | Three-step tracker (Accepted → Paid → Verified), QR + 6-digit arrival code, cancel action | each booking status renders a distinct view |
| "I'm here" / arrival code | 6 | Shows QR + digits once near appointment time; cached locally so it displays even with no signal | valid, used, expired |
| Booking history | 4 | Past/cancelled/completed bookings | — |
| Cancel / refund status | 7 | Cancel with policy-aware messaging ("full refund" / "₹X fee applies"), refund progress | pending, processing, refunded |
| Notifications | 8 | In-app notification center; push when backgrounded | unread badge |
| Reviews | 6 (schema)/later | Rate a completed booking | — |

### 3.4 Partner app — screen by screen

| Screen | Phase | Purpose | Key states |
|---|---|---|---|
| Shop profile edit | 3 | Name, address, hours (`opening_hours` jsonb), **prominent one-tap `is_open` toggle** | saved, validation error |
| Services CRUD | 3 | Add/edit/deactivate services; price/duration validated positive & sane-max both client- and Postgres-side | list, editing, validation error |
| Barbers CRUD | 3 | Add/edit/deactivate barbers (owner-managed records, no individual barber login in MVP) | list, editing |
| Incoming booking (slot) | 4 | Loud/persistent alert (sound, not silent badge), countdown to `shop_response_expires_at` (~90–120s), Accept/Reject | pending, responded, expired |
| Incoming booking (instant) | 9 | High-priority push; Accept races the atomic first-wins update — "offer taken" if lost | broadcasting, won, lost |
| Booking queue / today's schedule | 4 | Chronological view of confirmed bookings for the day | — |
| Verify arrival | 6 | Scan QR or type 6-digit code | scanning, verified, wrong code, expired, locked out (5 attempts) |
| Start / complete service | 6 | Enabled only after verification succeeds server-side (re-checked, not just UI-hidden) | locked, unlocked, in service, completed |
| "+10 min" running-over nudge | 8 | One tap to push a heads-up to the next customer | — |
| Cancellation / refund view | 7 | See refund status for a cancelled booking | — |
| Earnings / payouts | 10 | Daily payout history, `shop_earnings` per booking | pending, transferred, failed |
| Razorpay Route onboarding | 10 | Hosted KYC flow handoff; status display only | not started, pending, active |

### 3.5 Admin dashboard (web, Phase 12)

A small Next.js app for **exceptions and configuration**, deliberately not routine approvals:

| Section | Purpose |
|---|---|
| Shop approvals | Approve/reject pending shop signups |
| Booking / customer search | Look up a booking or customer for support |
| Payments & refunds | Visibility into payment/refund state, manual refund trigger for edge cases |
| Shop earnings | Payout visibility, retry failed transfers |
| Disputes | Manual resolution path for aesthetic/subjective complaints (never a chargeback path) |
| Configuration | `app_config` values — cancellation windows, no-show fee %, Instant Booking radius/timeouts, commission % |
| Analytics | Funnel views from `analytics_events` |

Every mutation here writes an `admin_audit_log` row with before/after state, confirmed *before* the change is shown as applied to the admin user.

### 3.6 Cross-cutting UX patterns

- **Live updates over pull-to-refresh.** From Phase 8 on, booking status screens subscribe to Supabase Realtime so state changes (shop accepted, payment captured) appear within seconds without a manual refresh; push notifications cover the backgrounded case.
- **Optimistic UI is display-only.** A button can show a spinner immediately, but the screen's actual status label only changes once the server confirms — never assume success from a client-side call, per §2.2.
- **Degraded network is a designed-for state, not an edge case.** The Phase 6 arrival code is fetched once with margin and cached locally so it still displays inside a signal-dead basement shop; only the *partner's* verification call needs connectivity, and that side of the interaction typically has better signal.
- **Empty and loading states are explicit everywhere data is fetched live** (shop list, bookings, notifications) — no screen silently renders nothing with no explanation.

---

## 4. Security & safety

This section restates and organizes CLAUDE.md §5 with an eye toward "how does this actually get implemented," plus the safety-specific controls layered on top. CLAUDE.md remains the source of truth for anything not repeated here.

### 4.1 Authentication

- Phone OTP via Supabase Auth; Supabase's built-in throttling limits SMS-bombing/brute-force, tightened explicitly in Phase 13.
- Session JWTs live in `expo-secure-store` (encrypted), never `AsyncStorage` (unencrypted on-device).
- `profiles.role` is the only source of truth for role — read server-side from the authenticated session, never accepted as a request parameter.

### 4.2 Authorization — Row Level Security

RLS is enabled in the same migration that creates each table; a table with RLS on and no policies is safely unreadable/unwritable by default, not a bug to silence.

| Table family | Read policy | Write policy |
|---|---|---|
| `profiles` | own row only | own row only |
| `shops` / `services` / `barbers` | public read where `status = 'approved'` | owner (`owner_id = auth.uid()`) only |
| `bookings` + everything hanging off it (`booking_services`, `booking_events`, `payments`, `booking_verifications`, `refunds`) | the booking's `customer_id` or the owning shop's `owner_id`/staff | **Edge Functions only** (service-role key) — no direct client writes to status-bearing columns |
| `admin_audit_log`, `app_config` | admin only | admin only, enforced by RLS *and* by the admin Edge Function checking `role = 'admin'` |

**Policies are verified, not assumed** — from Phase 4 on, every new policy is tested by attempting the forbidden access from a second, unrelated test account via a raw client call, not just by reading the SQL and believing it.

### 4.3 Secrets management

- Razorpay secret key, Razorpay webhook secret, and the Supabase service-role key exist **only** as Supabase Edge Function environment variables (`supabase secrets set`) — never committed, never referenced anywhere under `app/`, `components/`, `features/`, or `lib/`.
- The Expo bundle holds exactly three values: Supabase URL, Supabase anon key, Razorpay key **id** (public by design).
- `.env` with real values is git-ignored; `.env.example` documents the shape.

### 4.4 Input validation

- Every Edge Function validates payload shape before touching the database (Zod or hand-rolled checks) and rejects malformed input with 400, not a query error.
- Every client-supplied id (booking, shop, service) is re-resolved against the database and ownership-checked inside the function — the payload's claim is never trusted on its own.
- Amounts are **never** accepted from the client — an Edge Function creating a payment order computes the amount itself from `services.price`/`bookings.final_amount`.

### 4.5 Webhook security & idempotency

- Every webhook (`razorpay-webhook`, `refund-webhook`, Route's payout webhook) verifies the Razorpay signature against the raw body using the webhook secret *before any side effect*. Bad/missing signature → rejected, nothing written.
- Each webhook records the external event id it has processed (a `processed_webhook_events` table, or a unique constraint on `razorpay_payment_id`/`razorpay_refund_id`) and short-circuits on redelivery.
- Webhooks re-derive state from the database rather than trusting the payload's claimed event type wholesale.

### 4.6 Rate limiting & abuse prevention

- OTP requests capped per phone number and per IP (Supabase default in early phases, tightened in Phase 13 with a cooldown UI).
- Booking creation and payment-order creation rate-limited per user (Phase 13).
- `booking_verifications.attempt_count` locks out further code guesses after 5 tries — tested, not just implemented.
- New accounts capped to a small number of simultaneous pending bookings (start at 2) to blunt slot-hoarding abuse (Phase 13).

### 4.7 Data privacy

- PII (phone, name, precise address/lat-lng) never reaches `analytics_events` or crash reporting — IDs and category-level properties only.
- Verification codes are stored hashed (`code_hash`), never plaintext.
- Privacy policy and terms are published before the Play Store closed-testing release (Phase 13).

### 4.8 Safety features specific to GLIDE's model

These aren't generic app-security items — they're the controls that make the three-condition promise (§1) actually hold:

- **No status is ever client-set.** `bookings.status` and `payments.status` change only inside Edge Functions/webhooks running with the service-role key; RLS blocks direct client `UPDATE` on these columns entirely. This is what stops a tampered app or intercepted request from faking "shop accepted" or "payment captured."
- **Payment happens only after acceptance, confirmed only by webhook.** The client's Razorpay Checkout success callback is a UI hint, never a source of truth — the booking only flips to `confirmed` when `razorpay-webhook` verifies the signature and amount.
- **Arrival verification gates service start independent of payment.** Even a paid, shop-accepted booking cannot reach `in_service` without a successful `verify-arrival` call — checked server-side by `start-service`, not just hidden in the UI. This is what's tested directly (CLAUDE.md §11) by calling the Edge Function with an unverified booking id and confirming it's rejected.
- **Instant Booking's first-accept-wins is a single atomic conditional `UPDATE`** run inside an Edge Function with the service-role key — no client can win the race by calling `UPDATE` directly, because clients can't write to `bookings` at all (§4.2 above).
- **Refund amounts are policy-computed server-side**, never client-supplied, and a refund is only marked done once the `refund-webhook` confirms it — not on the API call's 200 response.
- **Disputes and no-shows are a manual-resolution path, not a chargeback path** — Terms of Service (Phase 13) state that post-verification service is non-refundable for subjective dissatisfaction.

---

## 5. Component-by-component reference

Each entry: what it does, the tables it owns, the Edge Functions involved, the screens that use it, and its core security invariant. Ordered by build phase.

### 5.1 Auth & profiles (Phase 1 — ✅ built)
- **Tables:** `profiles`.
- **Client:** `(auth)/phone.tsx`, `(auth)/verify.tsx`, `features/auth/auth-provider.tsx`, `features/auth/otp.ts`.
- **How it works:** phone → Supabase Auth OTP → on verify, session established → app reads/creates the `profiles` row → routes by `role`.
- **Invariant:** RLS restricts each user to their own `profiles` row; role is never a client-set parameter.

### 5.2 Shop/service/barber discovery (Phase 2 — ✅ built)
- **Tables:** `shops`, `services`, `barbers` (read side).
- **Client:** `(customer)/index.tsx`, `(customer)/shop/[id]`, `features/shops/api.ts`, `features/shops/geo.ts`.
- **How it works:** direct Supabase client queries against `shops`/`services`/`barbers` filtered to `status = 'approved'` — no hardcoded mock data.
- **Invariant:** unapproved/draft partner data is never exposed via the public read policy.

### 5.3 Partner shop/service/barber management (Phase 3 — 🚧 in progress)
- **Tables:** `shops`, `services`, `barbers` (write side).
- **Client:** `(partner)/index.tsx`, `(partner)/services.tsx`, `features/shops/partner-api.ts`.
- **How it works:** partner writes go directly through Supabase client calls scoped by RLS (`owner_id = auth.uid()`) — no Edge Function needed yet, since these writes don't touch money or booking state.
- **Invariant:** partner A cannot write partner B's shop/service/barber rows, verified with a second test account via raw client calls, not just the UI.
- **Still open:** barbers CRUD, the prominent `is_open` toggle.

### 5.4 Slot booking (Phase 4 — not built)
- **Tables:** `bookings`, `booking_services`, `booking_events`.
- **Edge Functions:** `create-booking`, `accept-booking`, `reject-booking`.
- **Client:** booking flow screens, partner incoming-booking screen.
- **How it works:** see §2.4's worked example. Slot collision is checked transactionally server-side before a hold is created; a scheduled job or polling check expires unanswered requests.
- **Invariant:** direct client `UPDATE` on `bookings.status` is blocked by RLS; only these three functions can move it.

### 5.5 Payments (Phase 5 — not built)
- **Tables:** `payments`; adds `bookings.payment_status` (kept separate from `bookings.status`, never merged).
- **Edge Functions:** `create-payment-order`, `razorpay-webhook`.
- **How it works:** see §2.4 and §4.8. Amount always server-computed; confirmation always webhook-driven.
- **Invariant:** webhook signature verified before any write; processed payment ids tracked for idempotency.

### 5.6 Arrival verification (Phase 6 — not built)
- **Tables:** `booking_verifications`.
- **Edge Functions:** `generate-service-code`, `verify-arrival`, `start-service`, `complete-booking`.
- **How it works:** hashed one-time code, rendered as QR + digits, cached client-side for offline display; verification and lockout enforced server-side.
- **Invariant:** `start-service` independently re-checks `verification_status = verified` and `payment_status = captured` — never trusts that the UI merely hid the button.

### 5.7 Cancellations & refunds (Phase 7 — not built)
- **Tables:** `refunds`; adds `app_config`.
- **Edge Functions:** `cancel-booking`, `process-refund`, `refund-webhook`.
- **How it works:** cancellation policy (free-window minutes, no-show fee %) lives in `app_config`, not hardcoded, so it's tunable without a release. Refund amount always policy-computed server-side; refund only marked done on webhook confirmation.
- **Invariant:** `cancel-booking` re-verifies the caller is actually the booking's customer or owning shop before evaluating any policy.

### 5.8 Notifications (Phase 8 — not built)
- **Tables:** `notifications`, `device_tokens`.
- **Edge Functions:** `send-notification`.
- **How it works:** Realtime subscriptions drive in-app live updates; `send-notification` also inserts a `notifications` row and fires an Expo push for the backgrounded case; a scheduled job sends appointment reminders.
- **Invariant:** a notification failure never propagates as a user-facing error in the booking/payment flow — it fails silently and just doesn't deliver that one push. No PII in push payloads beyond booking id/type.

### 5.9 Instant Booking (Phase 9 — not built)
- **Tables:** `booking_offers`; adds instant-specific columns to `bookings`.
- **Edge Functions:** `create-instant-booking` (broadcast), the atomic accept path (§4.8).
- **How it works:** see §2.4's worked example.
- **Invariant:** eligibility filtering happens entirely server-side; a shop can't fabricate eligibility for an offer it wasn't actually sent.

### 5.10 Payouts — Razorpay Route (Phase 10 — not built)
- **Tables:** `shop_earnings`; adds Razorpay account fields to `shops`.
- **Edge Functions:** `create-route-transfer`, `route-webhook`.
- **How it works:** payout eligibility triggers only after `bookings.status = completed`; commission split computed server-side from `shops.commission_pct`/`app_config`; target cadence is daily transfers given small-shop cash-flow needs.
- **Invariant:** a failed transfer affects only the shop's payout record, never the customer-facing booking status. GLIDE never stores raw bank details itself — Razorpay's hosted KYC owns that.

### 5.11 Analytics (Phase 11 — not built)
- **Tables:** `analytics_events`.
- **How it works:** events fired at key funnel points (booking created, payment success/failure, verified, completed, refund completed, instant requested/accepted); wrapped in try/catch that swallows and logs, never propagates.
- **Invariant:** breaking analytics on purpose must never block or error a real booking/payment.

### 5.12 Admin dashboard (Phase 12 — not built)
- **Tables:** `admin_audit_log`.
- **How it works:** see §3.5. All admin writes go through server-side functions checking `role = 'admin'` and logging before/after state — never a direct client table edit.

---

## 6. Database schema — quick reference

Full field lists live in CLAUDE.md §10; this is the phase map for orientation.

| Table | Phase | Owns |
|---|---|---|
| `profiles` | 1 | identity, role |
| `shops`, `services`, `barbers` | 1 | shop catalog |
| `bookings`, `booking_services`, `booking_events` | 4 | booking lifecycle + audit trail |
| `payments` | 5 | payment lifecycle |
| `booking_verifications` | 6 | arrival codes |
| `refunds`, `app_config` | 7 | refund lifecycle, tunable policy |
| `notifications`, `device_tokens` | 8 | push/in-app notifications |
| `booking_offers` | 9 | instant-booking broadcast |
| `shop_earnings` | 10 | payouts |
| `analytics_events` | 11 | funnel tracking |
| `admin_audit_log` | 12 | admin action trail |
| `reviews` | 6 (schema) | post-completion ratings |

Two rules that keep this future-proof, restated because they matter architecturally: `bookings.status` and `payments.status` are **always separate columns**; all money is stored as **integer paise**, never floating-point rupees.

---

## 7. Booking status state machine

```
draft → awaiting_shop ─┬→ confirmed → customer_arrived → verification_pending → verified
                        │                                                          │
                        ├→ rejected                                                ▼
                        │                                                     in_service
                        └→ expired                                                │
                                                                                    ▼
awaiting_shop → payment_pending (after accept, before payment captured)      completed

broadcasting (instant mode) → payment_pending (first accept wins) → … same as above
broadcasting → no_partner_found (timeout, no charge ever taken)

any post-payment state → cancelled_by_customer / cancelled_by_shop / shop_response_expired / no_show
                          (each may trigger a policy-computed refund — Phase 7)
```

Every arrow above is an Edge Function call or a webhook-driven transition — never a direct client mutation (§4.2, §4.8).

---

## 8. Open decisions (explicitly not yet built)

Carried from CLAUDE.md §13 — listed here so this document doesn't imply they're designed when they're deliberately deferred: loyalty/retention program, time-based dynamic pricing, promo/referral system, shop monetization beyond commission. Each needs an explicit decision before becoming a phase, not an opportunistic build.
