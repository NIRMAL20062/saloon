# GLIDE — Native Android Migration Plan

> **Decision record.** GLIDE's client is migrating from Expo (React Native) to **native Kotlin + Jetpack Compose**. This is a **client-only** swap: the Supabase backend (Postgres, RLS, Auth, Realtime, Edge Functions) does not change and is not rebuilt. This is a materially smaller move than the full "target architecture" described in `docs/TARGET_ARCHITECTURE.md` (custom Go/Node microservices, Kafka, Redis, self-managed Postgres, API Gateway) — that plan stays paused for the reasons already recorded there (real infra cost vs. an MVP that Supabase's free tier already covers). If that assumption is wrong and the intent is actually the full backend rewrite too, stop and re-scope before continuing past Phase 1 below.
>
> This document supersedes and consolidates `GLIDE_NATIVE_BUILD_PLAN.md` and `ANDROID_STUDIO_PDA.md` (both removed from the repo root after their content was folded in here and into `docs/NATIVE_ANDROID_SPEC.md`). Nothing in those two files is lost — see the "Where each source doc went" note at the bottom.

---

## 1. What's changing and what isn't

| Layer | Status |
|---|---|
| **Mobile client** | Rebuilt from scratch in Kotlin + Jetpack Compose. Expo/React Native app is retired once the native app reaches parity — not deleted on day one. |
| **Backend (Supabase)** | **Unchanged.** Same Postgres schema, same RLS policies, same Edge Functions (`create-booking`, `accept-booking`, `reject-booking`, `create-payment-order`, `razorpay-webhook`, `expire-bookings`), same migrations history. The native client is just a new consumer of the same API. |
| **Product rules & security model** | **Unchanged.** Server decides money and status, always. RLS on every table. Webhooks are the only source of truth for payment state. Secrets never touch the client. All of Section 3–5 of `docs/CLAUDE.md` still applies verbatim — only "the Expo app" becomes "the Kotlin app" wherever it's mentioned. |
| **Design system** | **Unchanged in substance, now enforced correctly.** Two fixed, flat, light-only palettes — Customer "Quiet Editorial Luxury" and Partner "Emerald Business Trust" — per `docs/THEME_AND_ROLES_COLOR_GUIDE.md`. **No dark mode, ever.** (`ANDROID_STUDIO_PDA.md` incorrectly specified a dark+light palette and `@Preview(uiMode = UI_MODE_NIGHT_YES)` — that was wrong and is not carried forward; see `docs/NATIVE_ANDROID_SPEC.md` §4.) |
| **Payments provider** | Unchanged — Razorpay, now via the native Android SDK instead of a WebView (this was already in progress on the Expo side too). |
| **iOS** | Out of scope for this plan. Native iOS is a separate track for whoever owns it; nothing here blocks that. |
| **The backend/microservices target architecture** | Unaffected. Still paused, still documented in `docs/TARGET_ARCHITECTURE.md`, still revisited only at the funded-scale trigger already recorded there. |

---

## 2. The key insight: this is a client rebuild against a backend that already works

Phases 1–5 of the product roadmap (`docs/CLAUDE.md` §8) are **done** — real schema, real RLS, real Edge Functions, tested in production against the Expo app. Rebuilding the client in Kotlin does not mean redoing that work. It means:

- **Phases 1–5 (native): re-implement existing, proven functionality against the existing backend.** Lower risk — the hard design questions (schema shape, RLS posture, booking state machine, webhook idempotency) are already answered and don't get revisited. The work is Kotlin UI + wiring to Edge Functions/tables that already exist.
- **Phases 6–13 (native): net-new, same as they would have been on Expo.** Arrival verification, refunds, notifications, Instant Booking, payouts, analytics, and the admin dashboard were never built on any client — these need new Edge Functions/tables *and* new Kotlin UI, exactly as much work as they'd have needed in React Native. Native doesn't make these phases bigger or smaller; it changes what language the client half is written in.

This reframes `GLIDE_NATIVE_BUILD_PLAN.md`'s "build the database schema first, as its own step" instruction, which was written as if starting from zero — it isn't. Do not re-run migrations 0001–0013 or rebuild `create-booking`/`accept-booking`/`reject-booking`/`create-payment-order`/`razorpay-webhook`; point the Kotlin client at them.

---

## 3. Where the native app lives, and the no-hard-cutover rule

- New Kotlin/Compose project lives in a new top-level directory, e.g. `android-native/`, alongside the existing Expo app — not replacing it in place.
- The Expo app **stays deployable and in production** until the native app reaches Phase 5 parity on a real device, mirroring the exact non-negotiable already recorded in `docs/TARGET_ARCHITECTURE.md`: "migration happens module by module... never a hard stop-and-rewrite." Nothing that currently works gets deleted or paused to make room for this.
- Package name: reuse `com.glide.app` per `ANDROID_STUDIO_PDA.md`, confirmed before any Play Store submission since it becomes permanent once published.

---

## 4. Ground rules for AI agents building this (carried over from `docs/CLAUDE.md` §2, restated for native)

1. **One phase, one feature, at a time.** Never scaffold the whole app or whole module tree in one go.
2. **Stop and ask before moving to the next phase.** Summarize what was built, exactly how to test it on a real device, and wait for confirmation.
3. **Every feature ships with something runnable** — the exact Gradle/adb command and what should appear on the phone screen or in the Supabase table editor.
4. **Server decides money and state, always** — a Kotlin `Repository` calling `postgrest.update()` directly on `bookings`/`payments` for a state-changing write is exactly as wrong as it would be from the Expo app. Every state-changing action goes through an Edge Function.
5. **No secrets in the app** — only Supabase URL, Supabase anon key, Razorpay key id, via `local.properties` → `BuildConfig`. Everything else (service-role key, Razorpay key secret, webhook secret) stays a Supabase Edge Function environment variable, exactly as today.
6. **Fixed palettes, no adaptive theming** — never `isSystemInDarkTheme()`, never a dark variant of either role's palette. See `docs/NATIVE_ANDROID_SPEC.md` §4.
7. **No feature from a later phase leaks into an earlier one**, and no premature Room/offline-first architecture — see the explicit "skip for now" decision in the spec doc.
8. **Never run `git commit`/`git push`/any git write without asking first, every time** — same rule as the rest of this repo.

---

## 5. Phase-by-phase plan

Phase numbers match the existing product roadmap in `docs/CLAUDE.md` §8, so status tracking (e.g. in `STARTUP_EXECUTION_ROADMAP.md`) stays consistent across both clients.

### Phase 0 — Native project bootstrap *(new, native-only)* — ✅ builds clean
**Build:** Android Studio project (`com.glide.app`, minSdk 26, compileSdk/targetSdk 37 — see spec doc note on why 37, not the originally planned 35), Gradle version catalog (`docs/NATIVE_ANDROID_SPEC.md` §1), Hilt, `MainActivity` with `enableEdgeToEdge()`.
**Test:** `./gradlew :app:assembleDebug` → `BUILD SUCCESSFUL`, verified in this repo at `android-native/`. **Not yet verified:** actually launching on a real phone/emulator — no device was attached in the environment this was built in. Do that check before treating Phase 0 as fully closed.

### Phase 1 — Foundation & Auth *(reused backend)* — ✅ builds clean
**Build:** Design system (`ui/theme/`) with the exact Customer/Partner hex tokens. Supabase Kotlin SDK client (`auth-kt`, `postgrest-kt`, `realtime-kt`, `storage-kt` — supabase-kt renamed GoTrue→Auth since this plan was first drafted) pointed at the **existing** project via the real Supabase URL/anon key already used by the Expo app. Session persistence via `EncryptedSharedPreferences` implementing supabase-kt's `SessionManager` interface — the native equivalent of `expo-secure-store`. Phone entry → OTP verify → reads the existing `profiles` row and routes to Customer/Partner home, or to onboarding (role selection + profile insert) if the row doesn't exist yet — mirrors `features/auth/otp.ts` + `features/auth/auth-provider.tsx` + `app/onboarding.tsx` exactly, same table/column names.
**Security checklist:** role always read from `profiles`, never inferred client-side. *(A `BuildConfig.DEBUG`-gated dev-login bypass, mirroring the Expo one, has not been added yet — not needed to compile, worth adding before this phase is called done so testing doesn't burn real OTP sends.)*
**Test status:** compiles and assembles clean (`BUILD SUCCESSFUL`, real Supabase URL/anon key wired via `local.properties` → `BuildConfig`). **Not yet verified:** an actual OTP round-trip against the live Supabase project, on a real device — this build environment has no phone/emulator attached, so the real acceptance test in the line below is still outstanding.
**Test:** real OTP login end to end for a customer and a partner account against the live Supabase project; session survives force-quit.

### Phase 2 — Customer discovery *(reused backend)*
**Build:** `ShopRepository` querying the existing `shops`/`services`/`barbers` tables (same `status='approved'` RLS posture). `FusedLocationProviderClient` for the same client-side Haversine nearest-first sort the Expo app already does.
**Security checklist:** foreground-only location permission; denial degrades gracefully, never crashes.
**Test:** distance-sorted list matches the Supabase table editor; denying location falls back to name-order with no crash.

### Phase 3 — Partner app basics *(reused backend)*
**Build:** Shop profile edit, services/barbers CRUD against the existing owner-scoped RLS policies. `shops.is_open` as a one-tap toggle, not buried in a form (per `docs/CLAUDE.md` §13 ground-reality item).
**Security checklist:** partner A genuinely cannot edit partner B's shop (test with a raw client call, not just hidden UI).
**Test:** new service/barber appears on Phase 2's discovery screens without a manual DB edit.

### Phase 4 — Slot Booking *(reused backend)*
**Build:** Shop detail, multi-service cart, slot picker calling the **existing** `create-booking` Edge Function; partner incoming-request screen calling the **existing** `accept-booking`/`reject-booking`. Countdown UI on `shop_response_expires_at`.
**Security checklist:** re-confirm the client never computes price/duration — it already doesn't server-side, this just verifies the Kotlin client doesn't regress that.
**Test:** two accounts racing the same barber/slot — second gets a clean "just taken," reusing the exclusion-constraint behavior already proven in migration 0008/0010.

### Phase 5 — Payments *(reused backend, native SDK is the actual upgrade)*
**Build:** Native Razorpay Android SDK checkout (replacing the WebView the Expo app currently uses) calling the **existing** `create-payment-order` function. Client-side success callback is a UI hint only — the **existing** `razorpay-webhook` remains the sole source of truth. App-startup reconciliation for a `payment_pending` booking (per `STARTUP_EXECUTION_ROADMAP.md` Scenario 3).
**Security checklist:** webhook signature verification and idempotency already exist server-side — verify the native client doesn't bypass them via some new call path.
**Test:** one real test-mode payment confirms end to end; force-quit mid-payment and reopen doesn't duplicate the order.

> **Native app reaches parity with the Expo app here.** This is the checkpoint for the no-hard-cutover decision in §3 — only after Phase 5 passes on a real device does retiring the Expo app become a live option, and that's still a separate decision, not automatic.

### Phase 6 — Arrival verification *(net-new, backend + client)*
**Build:** `booking_verifications` table, `generate-service-code`/`verify-arrival`/`start-service`/`complete-booking` Edge Functions (none exist yet). Customer: QR + 6-digit fallback, fetched with margin before arrival and displayed from local state so a signal-dead basement shop doesn't block *display* (only `verify-arrival`, run from the partner's side, needs connectivity — per `docs/CLAUDE.md` §13 and `STARTUP_EXECUTION_ROADMAP.md` Scenario 2/7). Partner: CameraX + ML Kit barcode scan, or manual digit entry.
**Security checklist:** codes stored hashed, never plaintext; attempt-count lockout genuinely tested, not just implemented.
**Test:** correct code works once; reuse, expiry, wrong-shop all fail; "Start Service" is disabled server-side, not just hidden.

### Phase 7 — Cancellations & automatic refunds *(net-new)*
**Build:** `refunds` table, `app_config` (policy values, e.g. no-show fee %, grace-period minutes — confirm actual numbers with the team before launch), `process-refund`/`refund-webhook`/`cancel-booking` Edge Functions.
**Security checklist:** refund amount always server-computed from policy + original payment.
**Test:** shop-rejects-after-payment, shop-timeout, and both sides of the free-refund window, each actually completing in Razorpay test mode; duplicate webhook delivery doesn't double-process.

### Phase 8 — Notifications *(net-new)*
**Build:** `notifications`/`device_tokens` tables, Supabase Realtime subscription on `bookings` for live in-app updates, `send-notification` Edge Function, Firebase Cloud Messaging for backgrounded/locked-phone push. Partner-side audio chime/looping alert + fallback SMS/WhatsApp for unacknowledged high-value bookings after 45s (per `STARTUP_EXECUTION_ROADMAP.md` Scenario 1 — this is what actually fixes "the busy barber misses the timer").
**Security checklist:** a device registers for push only on bookings/shops it actually owns, enforced server-side.
**Test:** backgrounded app receives a real push on a status change within seconds.

### Phase 9 — Instant Booking *(net-new)*
**Build:** `booking_offers` table, `broadcasting` status, eligibility query (radius, `accepts_instant`, open, price ≤ max), `create-instant-booking` function, atomic first-accept-wins `UPDATE ... WHERE status='broadcasting'`. Preferred-barber handling: if the customer's requested barber isn't available at an eligible shop, prompt reschedule/switch rather than silently reassigning (per `docs/CLAUDE.md` §13).
**Security checklist:** the atomic update runs only inside the Edge Function; a shop's client can never race it directly (clients still can't write `bookings` at all).
**Test:** two shops accepting simultaneously — exactly one wins; zero eligible shops falls back to the normal list; a broadcast timing out needs no refund since no payment was ever taken.

### Phase 10 — Razorpay Route payouts *(net-new)*
**Build:** `shop_earnings` table, Razorpay Linked Account onboarding, `create-route-transfer`/`route-webhook`. Target **daily** payouts, not a longer cycle (cash-flow reality for small shop owners, per `docs/CLAUDE.md` §13) — plus a manual/batch UPI fallback path for shops that don't clear formal KYC.
**Security checklist:** commission split always server-computed from `shops.commission_pct`/`app_config`; GLIDE never stores raw bank details itself (Razorpay's hosted onboarding handles that).
**Test:** a completed booking produces a correctly-split transfer in Route test mode; a broken transfer never changes the customer-facing booking status.

### Phase 11 — Analytics *(net-new)*
**Build:** `analytics_events` table, tracking calls at the funnel points already defined in `docs/CLAUDE.md` §8 Phase 11. No PII in events — IDs and category-level properties only.
**Test:** deliberately breaking the analytics insert never blocks a real booking/payment.

### Phase 12 — Admin dashboard *(unaffected by the client language choice)*
Stays a small Next.js web app per the existing plan — this phase doesn't change because the mobile client is native.

### Phase 13 — Hardening & release prep
**Build (native-specific additions):** signed release keystore backed up outside the dev machine; R8/ProGuard enabled; `BuildConfig.DEBUG=false` confirmed with no dev bypass reachable; grep the Kotlin source tree for secrets before shipping; sideload the signed release APK for a full smoke test before any Play Store submission.
Everything else — full RLS audit, rate limiting, dependency audit, the scenario matrix in `docs/CLAUDE.md` §11, crash monitoring, CI — is unchanged from the existing Phase 13 plan.

---

## 6. Deliberately out of scope for this plan

- **iOS.** Separate track, not blocked by this document.
- **The full microservices target architecture** (`docs/TARGET_ARCHITECTURE.md`). Still paused. This plan does not revisit that decision — it's orthogonal (client language vs. backend architecture are two different axes).
- **Room/offline-first local database.** `ANDROID_STUDIO_PDA.md` proposed Room as a source-of-truth cache layer from Phase 2 onward. Skipped for now — the current Expo app doesn't have offline-first either, and adding it now would be scope the phase doesn't need yet. Revisit only if a real usability problem shows up in testing (see spec doc §2 for the explicit reasoning).

---

## 7. Where each source doc went

- `GLIDE_NATIVE_BUILD_PLAN.md` (phase structure, security/test checklists, non-negotiable rules) → folded into §4–5 above.
- `ANDROID_STUDIO_PDA.md` (Gradle version catalog, module structure, domain models, dev workflow, coding standards) → folded into `docs/NATIVE_ANDROID_SPEC.md`, **except** its dark-mode palette and dark-mode `@Preview` guidance, which was a direct violation of `docs/THEME_AND_ROLES_COLOR_GUIDE.md` and is explicitly dropped — see spec doc §4.
- Both original files were deleted from the repo root after this consolidation. Nothing in them is missing here; if something looks gone, check this document and the spec doc before assuming it was lost.
