# GLIDE — Target Architecture Development Roadmap

> **Companion to `docs/TARGET_ARCHITECTURE.md`.** That document says *what* the end state looks like (services, stack, ownership). This document says *how a real team gets there* — phase by phase, who does what, what "done" means, and what has to pass before moving on.
>
> **Same ground rule as the architecture doc:** the current Expo/React Native + Supabase app stays live and keeps shipping throughout. Every phase below runs alongside it, feature-flagged and verified side-by-side, until each new piece has earned its cutover. Nothing here is a deadline — it's a sequence: don't start Phase *N* until Phase *N-1*'s exit criteria are actually met, not just "mostly done."
>
> Business rules, state machines, and policy specifics (the booking state machine, cancellation windows, verification-code lockout thresholds, etc.) that don't change with the new architecture are **not re-derived here** — they're referenced from `CLAUDE.md`, which stays the source of truth for *what the product does*. This roadmap is about *how the team builds it* on the new stack.

---

## How to read each phase

Every phase has the same five sections:
- **Goal** — the one-sentence outcome.
- **Backend / Android / iOS / DevOps** — concrete tasks per role, so all four collaborators have parallel work in the same phase instead of waiting on each other.
- **Testing gate** — what must pass before this phase counts as done. Not optional, not "we'll get to it later."
- **Exit criteria** — the specific, checkable condition that unlocks the next phase.

---

## Phase 0 — Team & Platform Foundations

**Goal:** every collaborator can build, test, and deploy something trivial through the full pipeline before anyone writes real feature code.

- **DevOps:**
  - Repo layout: one repo per native client (`glide-android`, `glide-ios`), one repo for backend services (can be a single "services" monorepo with independently deployable services, or split later once the team is bigger — don't over-split on day one).
  - Terraform baseline: VPC, Kubernetes cluster (EKS/GKE), managed Postgres (RDS/Cloud SQL) + PostGIS extension, managed Redis, Kafka cluster (MSK/Confluent Cloud, or self-hosted if the team wants full control).
  - CI/CD pipeline template: lint → typecheck/build → unit tests → integration tests (against an ephemeral Postgres) → deploy to staging. Every service and both mobile apps use the same template shape.
  - Secrets manager provisioned (Vault or cloud-native equivalent); every service pulls its own secrets at startup and fails loudly if one's missing.
  - Observability: Sentry projects for both mobile apps and each backend service; Prometheus + Grafana (or Datadog) wired to the Kubernetes cluster; OpenTelemetry tracing enabled cluster-wide from day one (retrofitting tracing later is much more painful).
  - Staging and production environments fully separate — staging never touches production data.
- **Backend:** define the OpenAPI 3.x contract-first workflow — a shared schema repo (or a folder in the services repo) that both mobile clients generate typed API clients from. Publish a trivial `/health` endpoint from a "hello world" service as the pipeline's first real deploy target.
- **Android / iOS:** scaffold both native projects (Kotlin/Compose, Swift/SwiftUI), wire up the generated-client codegen step in each project's build, confirm both apps can call the "hello world" service's `/health` endpoint from a real device/simulator through staging.
- **Testing gate:** a change to the "hello world" service, pushed to the services repo, is automatically built, tested, deployed to staging, and visible in Grafana/Sentry — with zero manual steps.
- **Exit criteria:** all four collaborators have shipped at least one trivial change through the full pipeline on their own piece (a backend endpoint, an Android screen, an iOS screen, a Terraform change) before Phase 1 starts.

---

## Phase 1 — Auth & API Gateway

**Goal:** a user can log in on both native apps and get a valid session against the new backend.

- **Backend:** Auth service (OTP send/verify, session issuance) — reuse the existing SMS/OTP provider from the current app if it's working well, no need to switch providers just because the backend is new. API Gateway: token validation on every request, rate limiting on the OTP-send route specifically (this is the classic SMS-bombing target). Port the `profiles` table and role model (`customer`/`partner`/`admin`) from the current Supabase schema — same shape, new database.
- **Android:** native OTP login screen; session token stored via Android Keystore-backed encrypted storage (the native equivalent of `expo-secure-store` — never plain `SharedPreferences`).
- **iOS:** native OTP login screen; session token stored in the iOS Keychain.
- **DevOps:** Auth service and API Gateway deployed to staging with TLS; rate-limit rule for OTP-send monitored in Grafana.
- **Testing gate:** OTP login end-to-end on a real Android device and a real iOS device; a rate-limit test (spamming OTP-send gets throttled, not silently ignored or crashing the service); a token-refresh test (an expired access token refreshes without forcing re-login).
- **Exit criteria:** both native apps can authenticate a real phone number against the new backend and hold a session across app restarts.

---

## Phase 2 — Discovery Service

**Goal:** the "browse shops near me" experience runs fully on the new backend — chosen first because it's read-heavy and not correctness-critical, the safest place to prove the whole pipeline on real (if non-critical) traffic.

- **Backend:** Discovery Service reading `shops`/`services`/`barbers` from a Postgres read replica; port the current lat/lng distance-sort query to a proper PostGIS `ST_DWithin`/`ST_Distance` query with a geospatial index.
- **Android / iOS:** native browse/search/shop-detail screens calling the new Discovery Service instead of Supabase.
- **DevOps:** read replica provisioned and wired into the Discovery Service's connection config specifically (never point a read-only service at the primary by mistake).
- **Testing gate:** a parity test — the same query against both the old Supabase-based discovery and the new Discovery Service returns the same shops in the same order, for a representative set of test locations.
- **Exit criteria:** both native apps' browse experience is fully backed by the new service; the old discovery read path is marked deprecated (not deleted yet — keep it until the native apps are the only clients left).

---

## Phase 3 — Partner Shop Management

**Goal:** a partner can manage their shop profile, services, and barbers entirely on the new backend — needed before booking can be tested end-to-end on real (non-seed) data.

- **Backend:** shop/service/barber CRUD, owned by the Booking Service (or a shared "Catalog" module within it) — port the "partner can't touch `status`/`owner_id`/`commission_pct`" rule as an explicit service-side check in the write path, since there's no RLS-and-trigger combo doing this automatically anymore (this is the one place this architecture works harder than the current one, per `TARGET_ARCHITECTURE.md` Section 8 — treat it as seriously as the trigger it's replacing).
- **Android / iOS:** native partner-side shop profile / services / barbers / opening-hours screens.
- **DevOps:** no new infra — this phase is testing the write-path patterns the rest of the backend will reuse.
- **Testing gate:** an ownership-check test suite — a partner authenticated as shop A cannot read or write shop B's services/barbers/profile via direct API calls, not just "the UI doesn't show a button for it." This is the service-level replacement for the current app's RLS policy tests and must be just as strict.
- **Exit criteria:** partners manage their shop fully on the new backend; admin approval can still happen manually (Admin Service comes later, Phase 12) — don't block this phase on building admin tooling early.

---

## Phase 4 — Booking Service Core (Slot Booking)

**Goal:** the full slot-booking flow — pick a service, barber, and time; get confirmed or rejected by the shop — works natively end to end.

- **Backend:** Booking Service owning `bookings`/`booking_services`/`booking_events`. Port the Postgres exclusion constraint (`EXCLUDE USING gist (barber_id WITH =, tstzrange(...) WITH &&)`) verbatim — this is a database-level guarantee, not application logic, and it's already proven correct; don't reimplement the same guarantee as an application-level check, keep it in the schema. Port the draft → awaiting_shop → confirmed/rejected/expired state machine exactly as specified in `CLAUDE.md`. Publish `booking.*` events to Kafka on every state change.
- **Android / iOS:** native booking flow (service/barber/time picker → confirm → status screen), subscribing to booking-state updates (via the API Gateway's WebSocket support, or polling as a simpler first cut — upgrade to push-based updates once Phase 8's Notification Service exists).
- **DevOps:** Kafka topic(s) for booking events provisioned; consumer-lag monitoring in Grafana so a stuck consumer is visible immediately, not discovered days later.
- **Testing gate:** a concurrency test — fire many simultaneous booking requests at the same barber/time-slot from a load-testing tool, confirm exactly one succeeds and the rest get a clean "slot taken" response, same guarantee the current app's constraint already provides.
- **Exit criteria:** slot booking works end-to-end natively, running feature-flagged in parallel with the still-live Expo app, with the concurrency test passing reliably (not "passed once").

---

## Phase 5 — Payments Service

**Goal:** real payment capture happens natively against the new Payments Service, with every non-negotiable from `TARGET_ARCHITECTURE.md` Section 8 enforced.

- **Backend:** Payments Service — Razorpay order creation, webhook processing (raw-body signature verification before anything else runs, timing-safe comparison), idempotency ledger keyed on Razorpay's event id, amount always resolved server-side from the booking record.
- **Android:** native Razorpay Android SDK integration (replacing the current app's WebView-based Checkout.js approach entirely — this is the one piece of technical debt from the original build that this migration directly retires).
- **iOS:** native Razorpay iOS SDK integration.
- **DevOps:** Payments Service gets its own secrets-manager entries for the Razorpay key/secret/webhook-secret, separate from every other service's secrets.
- **Testing gate:** a webhook-replay test (deliver the same webhook payload twice, confirm no double-processing), a failed-payment test (booking stays in a retryable state, doesn't silently confirm), an amount-tamper test (a webhook claiming a different amount than the order is rejected, not trusted).
- **Exit criteria:** a real test-mode payment captures correctly on both native apps against the new service, with all three tests above passing.

---

## Phase 6 — Arrival Verification

**Goal:** the third leg of the "shop accepts → customer pays → verified on arrival" trust loop becomes real — this was only ever a UI mockup in the original build (`components/qr-scanner-modal.tsx`'s "Simulate QR Scan"), so this phase makes it actually work for the first time, not migrate an existing feature.

- **Backend:** extend the Booking Service with a `booking_verifications` table — short-lived, hashed verification codes (never stored plaintext), an attempt-count lockout after repeated failures, per `CLAUDE.md`'s Phase 6 spec.
- **Android:** CameraX + ML Kit barcode scanning on the partner side (real QR scanning, not a "Simulate" button); a code-display screen on the customer side that caches the code locally for offline display (a customer arriving with a spotty connection still needs to show their code).
- **iOS:** AVFoundation-based QR scanning on the partner side; the same offline-friendly code-display screen.
- **Testing gate:** an expired-code test, a lockout-after-N-attempts test, and an offline-cache test (code still displays with the network off).
- **Exit criteria:** the full three-step trust loop is verifiably real end-to-end for the first time in GLIDE's history — this is a meaningful milestone, not just another feature phase.

---

## Phase 7 — Cancellations & Refunds

**Goal:** a customer or shop can cancel a booking and the refund happens automatically — no manual Razorpay-dashboard intervention required.

- **Backend:** Payments Service extended with refund initiation via Razorpay's refund API; Booking Service enforces the cancellation-policy window (e.g., free cancellation up to N hours before the slot, per `CLAUDE.md`'s policy).
- **Android / iOS:** native cancel-booking flow with refund-status display.
- **Testing gate:** a partial-refund-window test (cancelling inside vs. outside the free window behaves differently and correctly) and a double-refund-prevention test (the same idempotency discipline as webhook processing — a retried cancel request doesn't refund twice).
- **Exit criteria:** refunds are fully automatic; this closes the single biggest pre-launch risk flagged for the current app (a paid booking with no automated way to reverse it).

---

## Phase 8 — Notification Service

**Goal:** shop owners are reliably notified of new bookings without needing the app open — the real fix for the current app's 100-second, no-push response window.

- **Backend:** Notification Service consuming `booking.*`/`payment.*` Kafka events; push via FCM (Android) and APNs (iOS); **WhatsApp Business API** integration specifically for shop-owner notifications (a shop owner mid-haircut is far more likely to see a WhatsApp message than an app badge); SMS as a last-resort fallback.
- **Android / iOS:** push-permission request flow; notification-tap deep-linking straight to the relevant booking.
- **DevOps:** Notification Service's Kafka consumer lag monitored — a lagging notification consumer is a silent failure mode that directly costs the business bookings, so this metric gets an alert, not just a dashboard.
- **Testing gate:** an end-to-end timing test — from `booking.awaiting_shop` being published to the shop owner receiving a push/WhatsApp message, measured and kept under a defined SLA (a few seconds, not minutes).
- **Exit criteria:** shop owners are notified reliably without the app open; this is the point where the current app's response-window design (previously flagged as unusable without push) actually becomes workable.

---

## Phase 9 — Instant Booking

**Goal:** the broadcast-to-many-shops, first-accept-wins flow works reliably under real concurrency.

- **Backend:** Booking Service extended with the broadcast pattern — a single conditional `UPDATE ... WHERE status = 'broadcasting' ... RETURNING` so exactly one shop's accept succeeds; Redis holds the live broadcast state (which shops have been offered, countdown timers) since this is ephemeral, not something that needs to survive a service restart the way a confirmed booking does.
- **Android / iOS:** native "Book Now" broadcast UI with a live countdown; partner-side "incoming instant request" screen with the same countdown.
- **Testing gate:** a broadcast race test — simulate many shops "accepting" the same instant-booking offer simultaneously, confirm exactly one wins and the rest get a clean "already taken" response.
- **Exit criteria:** Instant Booking is live and the race test passes reliably under realistic concurrency (not just two requests — load-test with the number of shops a real broadcast radius might realistically include).

---

## Phase 10 — Payouts (Razorpay Route)

**Goal:** shops actually get paid automatically, on a schedule, without a human wiring money manually.

- **Backend:** Payments Service extended with Razorpay Route integration; a `shop_earnings` ledger; a scheduled payout job (not purely event-driven — a scheduled reconciliation pass catches anything a webhook missed).
- **Admin:** a payout-status view (part of the Admin Service, Phase 12, but this phase's backend work can ship ahead of the admin UI if needed).
- **Testing gate:** a payout-reconciliation test against Razorpay Route's sandbox — confirm the ledger matches what Route actually paid out, including a simulated missed-webhook scenario that the scheduled job catches.
- **Exit criteria:** a shop in the test environment receives an automatic payout matching its actual earnings.

---

## Phase 11 — Analytics

**Goal:** the business can see real booking/payment funnel metrics without querying production Postgres by hand.

- **Backend:** an analytics events pipeline — Kafka events feeding into either a lightweight analytics-optimized store (e.g., ClickHouse) or aggregated summary tables in Postgres, whichever the team's DevOps/backend capacity supports; must **never** block or slow down a core transaction if this pipeline fails (same "swallow the failure, don't propagate it" discipline the current app already applies to its analytics calls).
- **Admin:** basic funnel dashboards (bookings created → confirmed → paid → verified → completed, with drop-off visible at each step).
- **Testing gate:** a failure-injection test — kill the analytics pipeline, confirm booking/payment flows are completely unaffected.
- **Exit criteria:** the team can answer "how many bookings dropped off between payment and verification last week" without a manual SQL query.

---

## Phase 12 — Admin Service (Full)

**Goal:** day-to-day operations no longer require a human editing the database directly.

- **Backend:** Admin Service — shop approval/rejection workflow, dispute-handling tools, an audit log of every admin action (who approved what, when).
- **Frontend:** an internal ops dashboard (a Next.js app is a reasonable, low-effort choice here — it's internal tooling, not customer-facing, so speed of build matters more than platform polish).
- **Testing gate:** every admin action produces an audit-log entry; an admin cannot bypass the audit log through any code path.
- **Exit criteria:** shop approval and dispute handling both happen through the Admin Service, and the "approve shops in the Supabase/Postgres table editor" workflow is fully retired.

---

## Phase 13 — Hardening, Load Testing, Compliance

**Goal:** sign-off to onboard real paying shops and customers beyond a small pilot.

- **DevOps:** load testing (k6 or Locust) against realistic pilot-launch traffic patterns, including simulated Instant Booking broadcast spikes; chaos testing — kill a service mid-traffic, confirm the rest of the system degrades gracefully instead of cascading; dependency vulnerability scanning wired into CI (not manual/on-demand anymore).
- **Backend (all services):** a security review pass across every service, re-verifying the Section 8 non-negotiables (ID re-resolution, webhook idempotency/signature checks, server-computed amounts, crash-fast secrets) hold in every service, not just the ones built first.
- **Exit criteria:** load test results, chaos test results, and the security review are all signed off before scaling past the pilot city/shop count.

---

## Cross-cutting rules that apply to every phase

- **No phase starts before the previous one's exit criteria are met.** "Mostly working" is not "done" — the exit criteria exist specifically to stop scope from quietly compounding.
- **Every contract change (an OpenAPI schema edit) is communicated to both mobile teams before merging**, never discovered after a client build breaks.
- **Every service enforces its own authorization explicitly** (Section 8 of `TARGET_ARCHITECTURE.md`) — there's no RLS doing it for free anymore, so a missing ownership check is a security bug, not a style nitpick, in every single phase above.
- **The current Expo/Supabase app is the fallback at every step** — if a new service has a problem in staging or early production, traffic can shift back to the existing path while it's fixed, because it was never turned off.
