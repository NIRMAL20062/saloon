# GLIDE — Target Architecture (North Star)

> **DECISION (recorded for the team):** After building and fully verifying a working Auth Service on this architecture (Node/Express, real Postgres, 31 passing tests — see git history), the team decided to **pause this track and stay on Supabase + Expo for the MVP.** The reasoning: GLIDE's near-term goal is ~200–300 users, and Supabase's free tier (50,000 MAU, 500MB DB, 500K function invocations/month) comfortably covers that with zero cost — while any version of this target architecture costs real money (roughly $150–400+/month for the full spec) from the moment it's provisioned, regardless of user count. That's not a good trade for a pre-revenue MVP. The working Auth Service code was removed from the repo (it's fully described here and reproducible from this document if needed later); this document and its roadmap companion stay as the plan for **when** the team should revisit this, not **whether** the current stack was a mistake — it wasn't.
>
> **The staged path back to this, when the time comes:**
> 1. **Now (0–500 users): $0/month.** Current Expo + Supabase app. Focus entirely on product-market fit.
> 2. **Early traction (500–5,000 users): ~$5–25/month.** Upgrade the mobile app via Expo Prebuild/EAS Build (still one codebase) for native camera QR scanning and the native Razorpay SDK; self-host backend services on a single cheap VPS (Hetzner/DigitalOcean, ~$5–10/month) running Postgres + the services in this document via Docker Compose — no Kubernetes, no Kafka yet.
> 3. **Real scale (10,000+ users), scale-funded.** Only at this point does the full architecture below (native Android + iOS, Kubernetes, Kafka, managed cloud databases) become worth its cost — hire dedicated mobile engineers and build it out as specified.
>
> Re-read this status note at the start of any future session that touches this document, so the decision isn't silently forgotten.

> **Status:** This is the long-term architecture GLIDE is migrating *toward*, written for a real, multi-person team — not a solo build. It is **not** what's running today.
>
> **What's running today** (Expo/React Native + Supabase + Razorpay, Phases 1–5 complete) **stays in production and keeps shipping features** while this is built out. Nothing already working gets deleted or paused. Migration happens module by module, on the schedule in Section 9, with explicit cutover criteria — never a hard stop-and-rewrite. See `README.md` for what's actually deployed right now, and `CLAUDE.md` for the phase-by-phase build log that got it there; both stay accurate for the current app throughout this migration.
>
> This document is deliberately detailed enough that a new collaborator — or an AI agent — can pick up any one section and start implementing it without needing the rest of this conversation's context.

---

## 1. Why this document exists

GLIDE started as a solo, first-time-Android-dev build, which is why the current stack (Expo managed workflow, Supabase as a combined DB/Auth/Edge-Function backend) was the right call — it was fast to build, required no native tooling, and got a working two-sided marketplace shipped in days, not months.

That constraint no longer holds. With collaborators covering native Android, native iOS, backend/distributed systems, and DevOps/infra, the team can now build the version of GLIDE that's optimized for scale, reliability, and platform depth instead of solo-dev velocity. This document is that target.

**The domain model doesn't change.** Shops, barbers, services, bookings, payments, the booking state machine, the "three things must line up" trust loop (shop accepts → customer pays → verified on arrival) — all of that is proven correct in the current build and carries over as-is. What changes is *how* it's implemented and *who* owns each piece.

---

## 2. Target architecture at a glance

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   Native Android App    │     │    Native iOS App        │
│   Kotlin + Compose       │     │    Swift + SwiftUI       │
└────────────┬─────────────┘     └────────────┬─────────────┘
             │                                 │
             │         HTTPS / WSS (via API Gateway)
             └────────────────┬────────────────┘
                               ▼
                     ┌───────────────────┐
                     │   API Gateway      │  (auth, rate limiting, routing)
                     └─────────┬─────────┘
        ┌───────────┬──────────┼──────────┬───────────┐
        ▼           ▼          ▼          ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │ Booking │ │Payments │ │Discovery│ │  Notif  │ │  Admin  │
   │ Service │ │ Service │ │ Service │ │ Service │ │ Service │
   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │           │           │
        └─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┘
              ▼           ▼           ▼           ▼
        ┌──────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
        │ Postgres │ │  Redis  │ │  Kafka   │ │  Object   │
        │ (+PostGIS)│ │ (cache/ │ │ (events/ │ │  Storage  │
        │  primary  │ │  locks) │ │  queue)  │ │  (photos) │
        └──────────┘ └─────────┘ └─────────┘ └──────────┘

  External: Razorpay (payments + Route payouts) · FCM/APNs (push) ·
            WhatsApp Business API (merchant notifications) · Maps SDK
```

Every service is independently deployable, independently ownable, and talks to every other service only through its published API contract (Section 4) — never by reaching into another service's database.

---

## 3. Mobile clients

### 3.1 Why native, not React Native
The current app works around real limitations to stay in Expo Go: Razorpay checkout runs in a WebView instead of the native SDK, "scan QR to verify arrival" is a UI mockup with no camera integration yet, and any feature needing a native module (background location for live barber tracking, richer camera handling, deeper push customization) would force ejecting anyway. With dedicated Android and iOS engineers, there's no reason to keep paying that tax — going fully native from the start gets the real SDKs, real camera access, and full platform capability with no workaround layer.

### 3.2 Android
- **Language/UI:** Kotlin, Jetpack Compose.
- **Architecture:** Clean Architecture + MVVM — `data` / `domain` / `presentation` layers per feature module (`booking`, `payments`, `discovery`, `partner`), mirroring the current app's `features/*` boundaries so the domain logic maps over conceptually.
- **Networking:** Retrofit + OkHttp against the API Gateway; a typed client generated from the OpenAPI spec (Section 4) so the mobile and backend teams never hand-drift the API contract.
- **Local persistence:** Room, for offline-friendly booking status and cached discovery results.
- **Payments:** Razorpay's native Android SDK (not a WebView).
- **Push:** Firebase Cloud Messaging.
- **Camera/QR:** CameraX + ML Kit barcode scanning for real arrival verification (replacing the current "Simulate QR Scan" placeholder).
- **DI:** Hilt.

### 3.3 iOS
- **Language/UI:** Swift, SwiftUI.
- **Architecture:** Clean Architecture + MVVM, same module boundaries as Android for conceptual parity.
- **Networking:** the same generated OpenAPI client pattern (via a Swift codegen target), or URLSession + a thin typed layer if codegen tooling is a poor fit.
- **Local persistence:** SwiftData (or Core Data if the team prefers more maturity).
- **Payments:** Razorpay's native iOS SDK.
- **Push:** APNs (via FCM as the cross-platform sender, or direct APNs — Notification Service's call, Section 4.4).
- **Camera/QR:** AVFoundation for arrival verification scanning.

### 3.4 Shared, cross-platform (not code, *contracts*)
Android and iOS do **not** share a codebase in this target architecture — that's the tradeoff for going native. What they do share:
- The OpenAPI/protobuf contracts from the API Gateway (Section 4) — one schema, two generated clients.
- The design tokens from `docs/THEME_AND_ROLES_COLOR_GUIDE.md` (Customer vs. Partner palettes) — ported to each platform's native theming system (Compose `MaterialTheme` / SwiftUI `Environment` values), not re-invented per platform.
- The product/business rules (booking state machine, cancellation policy, verification flow) — defined once in the Booking Service (source of truth) and never re-implemented independently client-side beyond UI-hint validation, exactly like the current app's rule that the client never re-derives money/state decisions.

---

## 4. Backend services

Each service below is a separately deployable unit with its own datastore access, owned by whoever's on it — never a shared "one big backend" repo where everyone edits the same files.

### 4.1 API Gateway
- **Role:** single entry point for both mobile clients — authentication (validates the session token), rate limiting, request routing to the right internal service, and terminating WebSocket connections for real-time features.
- **Tech:** Kong, or a thin custom Go service if the team wants full control over auth/rate-limit logic. Either is fine; pick based on the DevOps owner's familiarity.
- **Contract:** every service behind it publishes an OpenAPI 3.x spec; the gateway's routing config and the generated mobile clients (Section 3.2/3.3) both derive from that spec, so the contract is the single source of truth, not tribal knowledge.

### 4.2 Booking Service
- **Owns:** shops, barbers, services, bookings, the booking state machine, slot-collision prevention, Instant Booking's broadcast/first-accept-wins race.
- **Tech:** Go — the concurrency primitives (goroutines + channels) and performance profile fit a service that has to correctly resolve races under load, which is exactly what slot-booking and Instant Booking are.
- **Data correctness carries over exactly:** the current app's Postgres exclusion constraint (`EXCLUDE USING gist (barber_id WITH =, tstzrange(...) WITH &&)`) preventing double-booked slots, and the atomic `UPDATE ... WHERE status = 'broadcasting' ... RETURNING` pattern for first-accept-wins, are correct patterns independent of what language sits on top — reimplement them as-is against the same Postgres schema, don't redesign them.
- **Real-time:** publishes booking-state-change events to Kafka (`booking.created`, `booking.confirmed`, `booking.expired`, etc.) that the Notification Service and Discovery Service both subscribe to, instead of each service polling the database.

### 4.3 Payments Service
- **Owns:** Razorpay order creation, webhook processing, refunds, and (once built) Razorpay Route payouts to shops.
- **Tech:** Go or Kotlin — pick whichever the Payments owner is strongest in; this service's correctness matters far more than its language.
- **Non-negotiables carried forward from the current build, verbatim:**
  - Every webhook's signature is verified against the *raw* request body before any other code runs, using a timing-safe comparison.
  - Every webhook event is idempotent via a processed-events ledger keyed on the provider's event id — a retried delivery is a safe no-op, not a double-charge/double-refund.
  - The amount charged is always resolved server-side from the booking record, never accepted from the client or blindly trusted from the webhook payload without cross-checking against the original order.
  - A missing required secret (webhook secret, API key) fails the request loudly (500) — it never silently proceeds with an insecure default.
- **New at this stage:** Razorpay Route integration for shop payouts, and a reconciliation job (scheduled, not just event-driven) that catches any webhook that never arrived.

### 4.4 Notification Service
- **Owns:** push (FCM/APNs), SMS fallback, and — specifically for this market — **WhatsApp Business API** messages to shop owners. A shop owner mid-haircut is far more likely to see a WhatsApp message than a silent app badge, which is the real-world failure mode the current app's 100-second, no-push booking-response window is exposed to.
- **Tech:** Node/NestJS or Go; this service is I/O-bound (calling external notification providers), so either is fine — pick based on team familiarity.
- **Trigger:** consumes Kafka events from the Booking/Payments services (`booking.awaiting_shop`, `payment.captured`, etc.) — it never reaches into another service's database to decide when to notify.

### 4.5 Discovery Service
- **Owns:** shop search/browse, geospatial "shops near me" queries, filters.
- **Tech:** whatever the team is fastest in (Node/Go/Kotlin) — this service is read-heavy and not correctness-critical the way Booking/Payments are.
- **Data:** reads from a Postgres read replica using **PostGIS** for geospatial queries (`ST_DWithin`, etc.) — this is a direct upgrade of the current app's simple lat/lng distance-sort query, same underlying idea, proper geospatial indexing at scale. Add Elasticsearch only if/when full-text search across shop names, services, and descriptions becomes a real product need — don't add it speculatively.

### 4.6 Admin Service
- **Owns:** shop approval, dispute handling, the operations dashboard backend.
- **Tech:** whatever's fastest to build (this is internal tooling, not customer-facing) — a Next.js app with server actions calling straight into Postgres (read replica + a narrow, audited write path) is a reasonable, low-effort choice here.
- **Replaces:** the current "approve shops manually in the Supabase table editor" workflow — appropriate at 10–15 shops, not appropriate once the admin team is a real team of people.

### 4.7 Auth
- **Approach:** keep phone-OTP as the login method (matches the market — most users won't have a memorable password anyway) via a dedicated Auth service or a managed provider (Auth0, AWS Cognito) fronting OTP delivery and session-token issuance.
- **Sessions:** short-lived access tokens + refresh tokens, validated at the API Gateway on every request — conceptually the same job Supabase Auth's JWT does today, just self-owned.
- **Authorization:** the current app leans on Postgres RLS for row-level authorization. In this architecture, each service is responsible for enforcing the equivalent check itself (e.g., Booking Service verifies the caller owns the shop before accepting a booking) — this is *more* code than RLS gives you for free, so it needs the same discipline RLS enforced automatically: **never skip an ownership check because "the client wouldn't have gotten this ID otherwise."**

---

## 5. Data layer

- **Primary datastore:** Postgres — self-managed (RDS, Cloud SQL, or Aurora), not Supabase-managed, so the team has full control over connection pooling, read replicas, and eventual sharding strategy.
- **Extensions:** PostGIS (geospatial), `btree_gist` (the slot-collision exclusion constraint already in use).
- **Migrations:** a real migration tool the whole team shares (Flyway, Atlas, or golang-migrate) — same principle as today's `supabase/migrations/`, just not Supabase-specific tooling.
- **Read replicas:** Discovery Service and Admin Service read from replicas; Booking and Payments Services write to (and read from, for anything requiring strong consistency) the primary.
- **Cache/locks:** Redis, for anything that needs to be fast and ephemeral — rate-limit counters, Instant Booking's live broadcast state, session-adjacent lookups. Not a source of truth for anything financial or state-machine-related; Postgres stays the only source of truth there.
- **Events:** Kafka, as the backbone connecting services (Section 4) — every state change that another service cares about is published once, not polled for by every consumer.
- **Object storage:** S3-compatible storage for shop/barber photos, replacing Supabase Storage.

---

## 6. Payments

Razorpay stays the payment provider — this was never a solo-dev constraint, it's the correct vendor for an India-first marketplace regardless of team size, and Razorpay **Route** already covers the shop-payout half of the problem, so there's no second PSP to integrate for that. What changes:
- Native Razorpay SDKs on both platforms (Section 3) instead of a WebView.
- The Payments Service (Section 4.3) is a dedicated, independently scalable service instead of two Edge Functions.
- A reconciliation job runs on a schedule against Razorpay's API to catch any webhook that never arrived — belt-and-suspenders on top of (not instead of) webhook-driven updates.
- At meaningful volume, consider a second PSP (e.g., Cashfree, PayU) integrated behind the same Payments Service interface for redundancy/negotiating leverage — this is a scale-driven optimization, not a day-one requirement.

---

## 7. Infrastructure & operations

- **Containers:** Docker for every service.
- **Orchestration:** Kubernetes (EKS or GKE) — the DevOps owner's call on which cloud.
- **IaC:** Terraform for everything — no manually-clicked cloud console changes once this is live, the same "no manual production changes" discipline the current app already applies to database migrations.
- **CI/CD:** every service gets its own pipeline — lint, typecheck/build, unit tests, integration tests against a real ephemeral Postgres, then deploy. This is a direct scale-up of the lightweight CI the current app should already be adding at its own stage (see `docs/STARTUP_EXECUTION_ROADMAP.md` if present, or the equivalent phase in `CLAUDE.md`).
- **Observability:** Sentry for crash reporting (both mobile apps and backend services), Prometheus + Grafana (or a managed equivalent like Datadog) for metrics/logs/tracing, with distributed tracing (OpenTelemetry) across service boundaries so a slow booking request can be traced through Gateway → Booking Service → Postgres in one view.
- **Secrets:** a real secrets manager (Vault, or the cloud provider's native one) — every service pulls its own secrets at startup and **fails loudly if one is missing**, the same crash-fast discipline already fixed in the current app's Razorpay Edge Functions.
- **Environments:** proper staging and production separation, with production data never accessible from staging tooling.

---

## 8. Security — carried forward, not relearned

Everything already true and hard-won in the current build ports over as an explicit requirement, not a suggestion:
- **Every ID from the client is re-resolved server-side** — a `booking_id`/`shop_id` in a request is looked up and ownership-checked inside the owning service, never trusted because the client sent it.
- **Every webhook is signature-verified against the raw body, before anything else runs**, and **idempotent** by construction.
- **Money amounts are always server-computed**, never accepted from the client or blindly trusted from a third-party payload without cross-checking.
- **No secret ever ships inside a mobile app bundle** — API keys/webhook secrets live only in each backend service's secrets manager entry.
- **A missing critical secret fails the service startup or the specific request loudly**, never silently with an insecure default.
- **Every service enforces its own row/resource-level authorization explicitly**, since there's no RLS doing it automatically anymore — this is the one place this architecture has to work *harder* than the current one to keep the same guarantee.

---

## 9. Migration plan — module by module, current app stays live throughout

Suggested order, each step shippable and reversible on its own:

1. **Stand up the Discovery Service first.** It's read-heavy, not correctness-critical, and lowest-risk to get the team's CI/CD, Kubernetes, and observability patterns proven out on real (if non-critical) traffic before touching anything money- or booking-related.
2. **Extract the Payments Service next**, running against the *same* Postgres database the current app uses, behind a feature flag — cut over booking-by-booking, verify against the existing idempotency/signature-verification test suite, keep the old Edge Functions as a fallback until the new service has a clean track record.
3. **Extract the Booking Service.** By this point the team has proven the pattern twice; this is the highest-stakes one (the slot-collision and Instant Booking races), so give it the most scrutiny and the longest side-by-side verification window.
4. **Build the Notification Service** (push + WhatsApp) — this can run in parallel with steps 2–3 since it only *subscribes* to events, it doesn't own any state.
5. **Native mobile rebuild (Android and iOS in parallel)**, once the backend services above are stable — the native apps talk to the *same* API Gateway contract the Expo app could theoretically also call, so this is a client swap, not a backend change.
6. **Admin Service and Auth migration last** — lowest urgency, since the current manual/Supabase-Auth approach works fine at pilot scale and there's no rush to replace something that isn't broken yet.

**Cutover criterion for every step:** the new service/client runs side-by-side with the old path, with real traffic mirrored or gradually shifted, for long enough to prove it handles every edge case the old path already handles correctly (slot collisions, duplicate webhooks, expired holds) — never a hard cutover on day one of a new service existing.

---

## 10. Team & ownership

With native Android, native iOS, backend/distributed-systems, and DevOps/infra collaborators now on the project, suggested ownership split:

| Area | Owner | Scope |
|---|---|---|
| Native Android | Android engineer | `android/` app, Compose UI, Room, FCM integration, native Razorpay/camera |
| Native iOS | iOS engineer | `ios/` app, SwiftUI UI, SwiftData, APNs integration, native Razorpay/camera |
| Booking + Payments Services | Backend engineer | Go services, Postgres schema/migrations, Kafka event contracts, the state-machine and money-correctness rules in Section 8 |
| Discovery + Notification + Admin Services | Backend engineer(s) | Lower-stakes services; good onboarding ground for a newer backend hire |
| Infra/CI-CD/Observability | DevOps engineer | Terraform, Kubernetes, CI/CD pipelines, Sentry/Grafana, secrets management |

Every service's API contract (Section 4.1) is the boundary between roles — a mobile engineer never needs to read backend service internals to integrate against it, and a backend engineer never needs to touch mobile code to change internal implementation, as long as the published contract doesn't break. Contract changes go through the same review process as any other breaking change, communicated before merging, not discovered after.

---

## 11. What this document is *not*

- Not a mandate to stop shipping on the current app — `README.md` and `CLAUDE.md` govern what's actually in production today, and stay authoritative for it.
- Not a fixed deadline — each migration step in Section 9 happens when the team and the product are ready for it, not on a forced timeline.
- Not a claim that the current stack was a mistake — it was the correct choice for a solo, first-time build, and got GLIDE to a working, tested, reasonably secure product fast. This document describes where to go *next*, now that the constraints that shaped the first choice no longer apply.
