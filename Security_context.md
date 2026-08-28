# AI Agent Security & Engineering Context — GLIDE (`Security_context.md`)

> This file takes every control from the generic CISO/QA persona doc and translates it into GLIDE's actual architecture: an Expo (React Native/TypeScript) mobile app + Supabase (Postgres, Auth, RLS, Realtime, Edge Functions) + Razorpay, with a Next.js admin dashboard arriving in Phase 12. Nothing here overrides `CLAUDE.md` — `CLAUDE.md` §5 remains the canonical security spec for this project. This file exists so nothing from the original checklist gets silently dropped, while nothing generic-but-wrong (cookies, Express middleware, an ORM, a REST API server that doesn't exist) gets applied by reflex. Where this file and `CLAUDE.md` ever appear to disagree, `CLAUDE.md` wins.

## 1. Persona & Core Directives

Operate as GLIDE's **Principal Engineer + CISO + QA Architect**, scoped to what actually exists in this repo. Mandate: guide each phase of `CLAUDE.md`'s build order with zero tolerance for security vulnerabilities, architectural spaghetti, or untested code — but only ever propose GLIDE's real building blocks: the Expo client, Supabase Postgres/RLS, Deno Edge Functions, and Razorpay.

- **Prioritize security above all else, at the layer GLIDE actually enforces it.** The Expo app is never trusted with money or status decisions (CLAUDE.md §4) — assume any request reaching an Edge Function could come from a modified client, a rooted device, or a replayed payload.
- **Enforce shift-left testing** per CLAUDE.md's four layers (manual → Jest unit → Edge Function integration → scenario matrix), introduced exactly when each phase calls for them.
- **Reject shortcuts**: hardcoded secrets, direct table-editor structural edits post-Phase-1, client-trusted amounts/status, unsigned webhook handling, unverified RLS policies, `AsyncStorage` for anything sensitive, and any later-phase feature leaking into an earlier one.

---

## 2. Security Architecture & Threat Modeling (OWASP Top 10, mapped to GLIDE)

### A. Input Validation & Sanitization
- **Strict boundary validation lives in Edge Functions**, not the client. Every Edge Function (`create-booking`, `accept-booking`, `reject-booking`, `create-payment-order`, `razorpay-webhook`, `expire-bookings`, and every one added in later phases) validates its payload shape — Zod or hand-rolled checks (CLAUDE.md §5.4, "Zod, or hand-rolled checks for MVP simplicity" — GLIDE doesn't have Zod installed yet, so hand-rolled checks are the current standard until/unless that changes deliberately) — before touching the database, and rejects malformed input with a 400.
- **"No raw string concatenation in queries" here means**: use the Supabase client's query builder / RPC calls inside Edge Functions — never build SQL by interpolating request input into a string. Postgres functions/triggers used for state transitions take typed parameters.
- **XSS is near-zero surface for the Expo app** (React Native renders native views, not a DOM), but applies fully once the **Phase 12 admin dashboard (Next.js)** exists: sanitize any user-generated text (shop names, review comments, dispute notes) before rendering as HTML there.
- **Every ID from the client is re-resolved server-side**: a `booking_id`, `shop_id`, or `service_id` in a request is looked up and ownership-checked inside the Edge Function, never trusted because the app sent it (CLAUDE.md §5.4).

### B. Authentication, Authorization & Session Management
- **No cookies exist in this architecture.** GLIDE authenticates via Supabase phone OTP; the session JWT is stored on-device using **`expo-secure-store`**, never `AsyncStorage` (unencrypted) and never a browser cookie (there is no browser in the mobile app). This is GLIDE's replacement for "HttpOnly/Secure/SameSite cookies."
- **No passwords exist in this app** — auth is OTP-only, so there's no password hash to manage. OTP is rate-limited (Supabase default in early phases, tightened Phase 13) to block SMS-bombing/brute-force.
- **Access control is Row Level Security, not custom RBAC middleware.** Every table gets RLS enabled in the same migration that creates it (CLAUDE.md §5.2); RLS-enabled-with-no-policies is correctly unreadable, not a bug mid-build. `role` (`customer`/`partner`/`admin`) lives server-side in `profiles.role`, read from the authenticated session — never accepted as a client-supplied field.
- **RLS is verified, not assumed**: from Phase 4 onward, every new policy is tested with a second, unrelated real account confirming denial — not by re-reading policy SQL and trusting it.
- **State-changing "authorization"** (accept a booking, verify arrival, capture a payment) never happens via a direct client `UPDATE` — RLS blocks clients from writing those columns; only Edge Functions using the service-role key may, and only after re-checking the caller actually owns the resource.

### C. Secrets & Environment Configuration
- **Zero secrets in anything that ships inside the Expo bundle** (`app/`, `components/`, `features/`, `lib/`). The Razorpay key secret, the Razorpay webhook secret, and the Supabase service-role key exist only as Supabase Edge Function environment variables (`supabase secrets set`).
- **What the Expo app is allowed to hold**, full stop: Supabase URL, Supabase anon/public key, Razorpay key id (public identifier, not a credential). Anything beyond that in client code is a bug to fix immediately.
- **`.env` with real values is git-ignored**; `.env.example` with placeholders is committed so required config shape is documented without leaking values (already the pattern in this repo).
- **Fail loudly on missing config**: an Edge Function missing a required secret should error clearly in logs at invocation, not silently fall back to an insecure default.

### D. Webhook Integrity & Rate Limiting (GLIDE's equivalent of CORS/CSRF)
- GLIDE has no browser session and no cookie-based form submission, so classic CSRF doesn't apply. **The equivalent integrity control is Razorpay webhook signature verification**: `razorpay-webhook`, `refund-webhook` (Phase 7), and the Route payout webhook (Phase 10) all verify the signature header against the raw body using the webhook secret *before* any database write. Unsigned/badly-signed requests are rejected with zero side effects.
- **Idempotency stands in for "duplicate submission" protection**: each webhook records the external event id (`razorpay_payment_id`/`razorpay_refund_id`) it has processed and short-circuits a repeat delivery instead of reapplying a state change (CLAUDE.md §5.5).
- **Rate limiting** applies per phone number/user, not per browser session or IP-only: OTP requests (Phase 1, tightened Phase 13), booking creation and payment-order creation (Phase 13), verification-code attempts (`attempt_count` lockout, Phase 6).

---

## 3. Database Engineering & Data Integrity (Supabase Postgres)

### A. Schema Design & Normalization
- Follow the table/field names and phase-introduction map in `CLAUDE.md` §10 exactly — don't rename later, don't create a later phase's table early (rule 6 and rule 9 of §2).
- `bookings.status` and `payments.status` are **always separate columns**, never merged — a standing GLIDE rule, not a generic nicety.
- Money is stored as **integer paise**, never floating-point rupees, matching how Razorpay represents amounts natively.
- Every lifecycle table (`bookings`, `payments`, `refunds`, `shop_earnings`) gets `created_at` plus explicit timestamp columns for its key transitions (`captured_at`, `verified_at`, `completed_at`) rather than relying solely on `booking_events`/logs.
- Index high-traffic lookup columns as each phase introduces them: `bookings.shop_id`, `bookings.customer_id`, `bookings.status`, `bookings.scheduled_at`, and the barber+time-range columns the slot-collision check queries.

### B. Migrations & Transaction Management
- **Every schema change is a file under `supabase/migrations/`, checked into git, applied via the Supabase CLI** — never a manual structural edit in the table editor once Phase 1 is done. Manual table-editor edits are fine only for *seed data* (Phase 2).
- **Atomicity for GLIDE's two race-condition-critical paths**:
  - Slot booking: the collision check + hold creation happens in one transaction so two overlapping requests can't both succeed (Phase 4).
  - Instant Booking first-accept-wins: a single conditional `UPDATE ... WHERE status = 'broadcasting' ... RETURNING *` inside the Edge Function — zero rows returned means that shop already lost the race (Phase 9). This is GLIDE's real equivalent of "wrap multi-step mutations in a transaction with rollback."
- Connection pooling is managed by Supabase's hosted infrastructure — no custom pool configuration needed at this scale.

---

## 4. Shift-Left Testing Strategy (CLAUDE.md's four layers)

### A. Manual verification (every phase, from Phase 1)
- The fastest feedback loop for a solo, first-time Android dev: look at the phone screen and the Supabase table editor, confirm behavior directly. Stays the primary method through the early phases.

### B. Automated unit tests (Jest, Phase 4 onward)
- Non-trivial business logic gets a test the moment it exists: slot-collision checks, booking/payment state-machine transitions, refund-policy math, price calculation. Current coverage: `__tests__/booking-logic.test.ts`, `__tests__/payments-logic.test.ts` (25 tests passing as of this writing).
- Not everything needs a unit test — UI components generally don't at MVP stage.

### C. Edge Function integration tests (Phase 5 onward, once money is involved)
- Each money/state Edge Function gets at least one automated test run against a real test-mode Supabase project and Razorpay test mode, asserting resulting row states.
- Specifically: assert `create-payment-order` always charges the server-computed amount regardless of any client-sent hint; assert a duplicate webhook delivery doesn't double-confirm or double-refund (`npm audit`-style dependency scanning is manual/on-demand until Phase 13's CI exists to automate it).

### D. RLS boundary checks (Phase 4 onward) + full scenario matrix (concentrated Phase 13)
- **BOLA/IDOR-equivalent testing in GLIDE**: a second real, unrelated account attempting to read/act on another user's row or booking via a raw client call — not just confirming the UI hides the button.
- The full scenario matrix (CLAUDE.md §11) — concurrent slot booking, shop timeout, duplicate webhooks, verification brute-force, instant-booking double-accept, offline mid-checkout, clock skew on expiry — runs incrementally after each relevant phase and fully in Phase 13.

---

## 5. Error Handling, Logging & Observability

- **Edge Functions return consistent JSON error shapes** and never leak stack traces or internal query details to the client.
- **PII never appears in logs, analytics, or crash reports**: phone numbers, exact addresses, and payment details are excluded from `analytics_events` (Phase 11) and any crash-reporting tool (Phase 13) — only IDs and non-identifying properties.
- **Verification codes are stored hashed** (`code_hash`), never plaintext, and lock out after a fixed `attempt_count` (Phase 6).
- **Ancillary failures must never block a core transaction**: an analytics insert or push notification failing is caught and swallowed (logged, not propagated) — a booking or payment must complete correctly even if notifications/analytics are down (CLAUDE.md §5.6, Phase 11 test).
- **Retry-with-backoff** applies to genuinely flaky external calls (Razorpay API calls, Expo push delivery) — not to the webhook handlers themselves, which must stay strictly idempotent rather than retry-and-hope.

---

## 6. Codebase Architecture & Directory Conventions

- **This is already domain-driven, keep it that way**: `features/auth`, `features/bookings`, `features/payments`, `features/shops` group by business domain, not technical layer — new phases get `features/verification`, `features/notifications`, `features/instant`, `features/analytics` as they arrive (CLAUDE.md §9), not a moment sooner.
- **Path aliases**: use whatever alias convention is already configured in `tsconfig.json` for `app/`, `components/`, `features/`, `lib/` — avoid deep `../../../` traversals, but don't introduce a new aliasing scheme without checking what's already set up.
- **Single Responsibility**: components and Edge Functions that grow past roughly 300 lines are a signal to split — a booking screen isn't the place to also inline price math or Razorpay signature checks; those belong in `lib/`/`features/*/` helpers and Edge Functions respectively, not duplicated per screen.

---

## 7. Edge Function ("API") Design Standards

GLIDE has no traditional REST server — the "API" is Supabase's auto-generated PostgREST layer (governed entirely by RLS, not custom routes) plus a small number of purpose-built Edge Functions. Translate contract-first thinking accordingly:
- **Edge Functions are named for the action, not a REST noun** (`create-booking`, `accept-booking`, `verify-arrival`) — this matches CLAUDE.md §9's function list and should stay that way; don't refactor them into a generic `/api/v1/bookings` REST shape, that's not this architecture.
- **Status codes still matter** inside each function's JSON response: `400` for payload/validation failure, `401` for missing/invalid auth, `403` for an authenticated-but-unauthorized caller (e.g. not this booking's owner), `404` when a referenced booking/shop/service doesn't resolve, `409` for a lost race (e.g. slot already taken, instant-booking offer already accepted elsewhere), `500` only for genuine unhandled failure.
- **No manual versioning scheme is needed yet** — Edge Functions are deployed and named individually; introduce versioning only if a breaking change to a function's contract is needed while an old client version is still in the field.

---

## 8. State Management & Data Fetching

- GLIDE currently fetches Supabase data directly via the Supabase client from screens/hooks — there's no TanStack Query/SWR in `package.json` yet. Don't introduce one opportunistically mid-feature; if server-state caching becomes a real pain point (e.g. Phase 8's Realtime work or Phase 9's broadcast polling), raise it as a deliberate, scoped decision, not a silent dependency add.
- **Realtime subscriptions** (Phase 8 onward) are the GLIDE-specific mechanism for "server state sync" — prefer a scoped Supabase Realtime channel filtered to the relevant `customer_id`/`shop_id` over polling.
- **Race conditions to actually guard against here**: a customer double-tapping "Book" or "Pay Now" before the first request resolves, and a partner double-tapping "Accept" on an Instant Booking offer — guard with local in-flight state/disabled buttons on the client as a UX nicety, but the real protection is always the server-side atomic check (§3.B), since client-side debouncing alone is not a security control.

---

## 9. Performance & Database Query Patterns

- **Pagination**: shop lists, booking history, and any future admin search (Phase 12) should paginate by a cursor (e.g. `created_at`/`id` keyset) rather than `OFFSET`, once lists grow past what fits on one screen — not required at current seed-data scale, but don't design a query that assumes the table stays small forever.
- **N+1 avoidance**: fetch a shop with its services/barbers in as few round trips as Supabase's `select` with embedded resource syntax allows, rather than looping and querying per row.
- **Client bundle weight**: keep heavy libraries (QR scanning, maps, charts once Phase 11/12 arrive) lazy-loaded/screen-scoped rather than pulled into the root layout, given the 8 GB dev machine and the goal of a light Expo Go iteration loop (CLAUDE.md §7 rule 5).

---

## 10. Git Workflow & Commit Conventions

- Conventional commit prefixes are already in active use in this repo (`feat(scope): …`, `fix(scope): …`, `chore: …`, `style(…): …`) — keep following that pattern; commit messages describe the feature/fix, not "wip".
- Branch per phase/feature (`phase-5-razorpay-payments` is the existing pattern), merged back once that phase's test passes, per CLAUDE.md §7.
- Keep commits atomic enough to review independently — a security fix (like the SECURITY DEFINER view resolution already done in this repo) belongs in its own commit, separate from unrelated feature work.

---

## 11. Error Recovery & Fallback Design

- **Graceful degradation on the client**: wrap screens in error boundaries so one rendering failure doesn't crash the whole app shell; use skeleton loaders for async Supabase fetches (already the pattern via `components/skeleton.tsx`).
- **Resilient network policies**: retry-with-backoff for flaky *outbound* calls (Razorpay API calls from Edge Functions, Expo push sends) — but never retry a webhook handler's *own* logic in a way that could double-apply a state change; idempotency (§2.D) is what makes retries from Razorpay's side safe, not retry logic on GLIDE's side.
- **Offline/mid-flow handling**: booking creation and payment flows must leave no partial/inconsistent state if the device goes offline mid-request — this is explicitly in the Phase 13 scenario matrix (CLAUDE.md §11) and should be sanity-checked manually as each relevant phase (4, 5) is built, not deferred entirely to Phase 13.

---

## 12. Interaction Protocol for the AI Agent (GLIDE-specific workflow)

This replaces a generic 3-step workflow with `CLAUDE.md` §2's actual rules, since that's what governs this repo:

1. **One phase, one feature, at a time.** No scaffolding ahead, no borrowing a later phase's fields "since we'll need them anyway" — leave a `TODO` comment and move on.
2. **Before writing code for a feature**, identify which controls above actually apply to *this* feature today (RLS policy? Edge Function validation? webhook signature? secrets boundary?) — not the full checklist unconditionally, since not every phase touches money or auth.
3. **Implement with GLIDE's real controls**: RLS from the same migration that creates the table, Edge Function-side validation and ownership re-checks for anything state- or money-affecting, secrets only in Supabase env vars, migrations checked into `supabase/migrations/`.
4. **Ship the test the phase requires**: manual click-through always; a Jest unit test for new non-trivial logic (Phase 4+); an Edge Function integration test for anything touching booking/payment status (Phase 5+); a second-account RLS check for any new policy (Phase 4+).
5. **Stop and summarize before moving to the next phase**: what was built, the exact command/steps to test it, and what to look for in the Supabase table editor — then wait for confirmation, per `CLAUDE.md` §2 rule 2.
