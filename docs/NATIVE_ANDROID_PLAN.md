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

## 3. Where the native app lives

- The Kotlin/Compose project lives in `android-native/` at the repo root.
- Package name: reuse `com.glide.app`, confirmed before any Play Store submission since it becomes permanent once published.

> **Update — the Expo app has been removed.** This section originally planned a no-hard-cutover approach (keep the Expo app deployable until native reached Phase 5 parity, mirroring `docs/TARGET_ARCHITECTURE.md`'s module-by-module migration principle). The team made an explicit, informed decision to cut over immediately instead, while native is still only through Phase 3 — accepting that Phases 4–13 (booking, payments, verification, refunds, notifications, instant booking, payouts, analytics) don't exist on any client right now. `app/`, `components/`, `features/`, `hooks/`, `lib/` and related Expo config/deps are gone from the repo; `features/shops/api.ts` etc. are no longer available to read as a reference — the phase-by-phase `Build:` notes in section 5 below and the git history of this file are what's left to mirror against. The Supabase backend is unaffected either way.

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
9. **Every ViewModel/repository-level piece of logic gets a JVM unit test before its phase is called done** — this is how "it builds" gets checked against "it actually behaves correctly" without needing a device for every iteration, since a device isn't always attached in every environment this gets built in. Pattern established in Phase 1: define the repository as an interface (`domain/repository/`) with the real Supabase-backed implementation (`data/repository/`) bound via Hilt `@Binds`, then test ViewModels against a hand-written fake of that interface (`src/test/.../FakeAuthRepository.kt` — no mocking library needed for something this shape). This does not replace real on-device testing before a phase is truly done — it catches logic bugs early and gives a fast, no-hardware-needed feedback loop between real device passes.

---

## 5. Phase-by-phase plan

Phase numbers match the existing product roadmap in `docs/CLAUDE.md` §8, so status tracking (e.g. in `STARTUP_EXECUTION_ROADMAP.md`) stays consistent across both clients.

### Phase 0 — Native project bootstrap *(new, native-only)* — ✅ builds clean
**Build:** Android Studio project (`com.glide.app`, minSdk 26, compileSdk/targetSdk 37 — see spec doc note on why 37, not the originally planned 35), Gradle version catalog (`docs/NATIVE_ANDROID_SPEC.md` §1), Hilt, `MainActivity` with `enableEdgeToEdge()`.
**Test:** `./gradlew :app:assembleDebug` → `BUILD SUCCESSFUL`, verified in this repo at `android-native/`. **Not yet verified:** actually launching on a real phone/emulator — no device was attached in the environment this was built in. Do that check before treating Phase 0 as fully closed.

### Phase 1 — Foundation & Auth *(reused backend)* — ✅ builds clean
**Build:** Design system (`ui/theme/`) with the exact Customer/Partner hex tokens. Supabase Kotlin SDK client (`auth-kt`, `postgrest-kt`, `realtime-kt`, `storage-kt` — supabase-kt renamed GoTrue→Auth since this plan was first drafted) pointed at the **existing** project via the real Supabase URL/anon key already used by the Expo app. Session persistence via `EncryptedSharedPreferences` implementing supabase-kt's `SessionManager` interface — the native equivalent of `expo-secure-store`. Phone entry → OTP verify → reads the existing `profiles` row and routes to Customer/Partner home, or to onboarding (role selection + profile insert) if the row doesn't exist yet — mirrors `features/auth/otp.ts` + `features/auth/auth-provider.tsx` + `app/onboarding.tsx` exactly, same table/column names.
**Security checklist:** role always read from `profiles`, never inferred client-side. *(A `BuildConfig.DEBUG`-gated dev-login bypass, mirroring the Expo one, has not been added yet — not needed to compile, worth adding before this phase is called done so testing doesn't burn real OTP sends.)*
**Test status:** compiles and assembles clean (`BUILD SUCCESSFUL`, real Supabase URL/anon key wired via `local.properties` → `BuildConfig`). 14 JVM unit tests (`./gradlew :app:testDebugUnitTest`, all passing, no device needed) cover `PhoneEntryViewModel` (E.164 validation, success, repository-error surfacing), `OtpViewModel` (code-length validation, verify success/failure), `OnboardingViewModel` (empty-name validation, profile insert with selected role, insert-failure surfacing), and `RootViewModel` (logged-out start state, routes to onboarding when no `profiles` row exists, routes to the correct role's home, sign-out delegation) — against `FakeAuthRepository`, not a mocking library. **Still not covered by anything above, and still needing the real device:** whether `signInWith(OTP)`/`verifyPhoneOtp` actually round-trip correctly against live Supabase Auth, whether `EncryptedSessionManager` really persists a session across a force-quit, and whether the UI actually renders/behaves as expected on screen. Do the real-device pass in the line below before calling this phase done.
**Test:** real OTP login end to end for a customer and a partner account against the live Supabase project; session survives force-quit.

### Phase 2 — Customer discovery *(reused backend)* — ✅ builds clean, ⏳ untested on-device
**Build:** `ShopRepository` (+ `SupabaseShopRepository` impl) querying the existing `shops`/`services`/`barbers` tables exactly as `features/shops/api.ts` does (same columns, same reliance on RLS rather than a client-side status filter). `FusedLocationTracker` wrapping `FusedLocationProviderClient`, and a direct Kotlin port of `features/shops/geo.ts`'s Haversine `distanceKm`. `ExploreScreen`/`ExploreViewModel`: name-ordered list loads immediately, a non-blocking banner offers to enable location (checked silently first, no cold permission prompt), and the list re-sorts nearest-first once granted — shops missing `lat`/`lng` sort last rather than being dropped.
**Security checklist:** foreground-only location permission (`ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION` only, no background location); denial degrades gracefully, never crashes — covered by `ExploreViewModelTest`.
**Test status:** compiles/assembles clean. 6 new JVM unit tests (26 total across the app now, all passing) cover: initial load, repository-error surfacing, the banner appearing when permission isn't granted yet, nearest-first sorting with a shop that has no coordinates sorting last, denial not crashing, and search re-querying. One test bug this caught and fixed on the first run: the initial search state is `""` not `null` — worth knowing since a future phase's fake might make the same assumption. **Not yet verified:** real shop data on a real device/emulator, real location permission prompt UX, or that RLS genuinely still only returns approved shops from this client (should be true unchanged, but confirm it wasn't accidentally bypassed).
**Test:** distance-sorted list matches the Supabase table editor; denying location falls back to name-order with no crash.

### Phase 3 — Partner app basics *(reused backend)* — ✅ builds clean, ⏳ untested on-device
**Build:** `PartnerRepository`/`SupabasePartnerRepository` mirroring `features/shops/partner-api.ts` exactly — shop profile CRUD (name/address, using the trigger-protected columns correctly by never sending `status`/`owner_id`/`commission_pct`), the `is_open` one-tap toggle wired directly to a switch (not buried behind a form save), a 7-day opening-hours editor with the same HH:MM validation as the Expo version, and services/barbers CRUD with the same rupees→paise conversion and 480-minute duration ceiling. No delete — `is_active` toggles instead, matching migrations 0004/0005's deliberate lack of a DELETE policy. `PartnerHomeScreen` now has real content: create-shop form → a 3-tab (Shop/Services/Barbers) screen once a shop exists.
**Security checklist:** ownership is enforced server-side via the existing `owner_id`-join RLS policies and the `protect_shop_admin_fields` trigger — the Kotlin client never sends `status`/`owner_id`/`commission_pct`, consistent with what the trigger would silently override anyway.
**Test status:** compiles/assembles clean. 22 new JVM unit tests (42 total across the app now, all passing): pure validation logic (`parseServiceInput`/`validateServiceInput`/`validateOpeningHours` — rupee-to-paise conversion, the 480-minute ceiling, HH:MM format, open-before-close) plus ViewModel tests against fakes covering shop creation, the open/closed toggle's optimistic-update-with-revert-on-failure behavior, and service/barber add + active-toggle-with-revert. **Not yet verified:** real RLS enforcement from this client (that partner A genuinely can't touch partner B's shop — the line below), the opening-hours editor's actual usability on a real screen, or that a service typo really does surface the friendly client-side message before hitting Postgres's CHECK constraint.
**Test:** new service/barber appears on Phase 2's discovery screens without a manual DB edit.

### Phase 4 — Slot Booking *(reused backend)* — ✅ builds clean, ⏳ untested on-device
**Build:** `BookingRepository`/`SupabaseBookingRepository` calling the **existing** `create-booking`/`accept-booking`/`reject-booking` Edge Functions via the Supabase Functions plugin (`supabase.functions.invoke`, JWT attached automatically) — no backend changes; note that `accept-booking` moves a booking to `PAYMENT_PENDING`, never straight to `CONFIRMED` (only the Razorpay webhook does that, Phase 5). `ShopDetailScreen`: multi-service cart with a running price/duration total, barber picker, a 7-day date picker, and a client-side slot-candidate generator (`generateSlotCandidates`) that greys out past times and anything overlapping the existing `barber_busy_windows` view — the server's exclusion constraint is still what actually prevents a double-booking; this is only a preview so the customer isn't guessing blind. `BookingTrackerScreen` (customer) and `RequestQueueScreen` (partner, now a 4th tab) show booking status/incoming requests with a live per-second countdown to `shop_response_expires_at` — manual-refresh/15s-poll only, since Realtime push is Phase 8, not this one.
**Security checklist:** the client never computes price/duration — it sends raw selection (service ids, barber id, scheduled time) and displays back whatever the server returns, exactly as `create-booking`'s own validation already assumed.
**Test status:** compiles/assembles clean. 21 new JVM unit tests (63 total across the app now, all passing): pure slot-generation logic (closed days, closing-time boundary, busy-window overlap marked unavailable rather than dropped, past-time exclusion) plus ViewModel tests against fakes for the booking flow, the request queue's accept/reject, and the tracker. **A real bug this caught before it ever reached a device:** `generateSlotCandidates` used `LocalTime.plusMinutes()` for its loop bound, which wraps at midnight — a shop open until 23:30 sent the loop into an infinite cycle and OOM'd the test JVM. Fixed by switching to integer minute-of-day arithmetic for the loop bound, which can't wrap. **Not yet verified:** the actual double-booking race (two accounts hitting the same barber/slot at once) on real hardware — the line below is still the real acceptance test.
**Test:** two accounts racing the same barber/slot — second gets a clean "just taken," reusing the exclusion-constraint behavior already proven in migration 0008/0010.

### Phase 5 — Payments *(reused backend, native SDK is the actual upgrade)* — ✅ builds clean, ⏳ untested on-device
**Build:** `PaymentRepository`/`SupabasePaymentRepository` calling the **existing** `create-payment-order` Edge Function (reuses an open order if the customer re-enters checkout, exactly like the function already supports). Native Razorpay Android SDK (`com.razorpay:checkout` 1.6.41) instead of a WebView. The SDK's success/error callback lands on the launching Activity by design (`PaymentResultWithDataListener`) — `MainActivity` implements it and forwards through a small Hilt-singleton `PaymentResultBus` so `PaymentViewModel` can react without either one holding a reference to the other. That callback is treated as a UI hint only, exactly as documented: it never sets a booking to confirmed itself, it just tells `PaymentScreen` to pop back to `BookingTrackerScreen`, which re-fetches the booking's real status — the **existing** `razorpay-webhook` remains the only thing that can actually move a booking to `CONFIRMED`. `BookingTrackerScreen` now shows a "Pay ₹X" action once a booking reaches `PAYMENT_PENDING`.
**Security checklist:** the client never computes or sends an amount — `order.amount` comes back from the server's own `create-payment-order` response, and `order_id` is what ties the SDK checkout to that exact server-created order.
**Test status:** compiles/assembles clean. 4 new JVM unit tests (67 total, all passing): order creation, server-error surfacing, and both success/failure checkout-result paths through `PaymentResultBus`. **Not yet verified:** an actual test-mode Razorpay payment end to end, a duplicate/resumed checkout after a force-quit, or that the webhook genuinely confirms the booking without ever trusting the SDK's client-side callback — the line below is the real acceptance test, still outstanding.
**Test:** one real test-mode payment confirms end to end; force-quit mid-payment and reopen doesn't duplicate the order.

> **Native app now covers the same ground the Expo app did before it was removed** (Phases 1–5). The "no-hard-cutover, only after Phase 5" checkpoint originally planned here didn't end up being how this went — see §3's amendment: the team cut over immediately, well before this point, an explicit and informed call, not an oversight.

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
Everything else — full RLS audit, rate limiting, dependency audit, the scenario matrix in `docs/CLAUDE.md` §11, crash monitoring — is unchanged from the existing Phase 13 plan.

> **Amendment — basic CI pulled forward from this phase.** `.github/workflows/android-ci.yml` (lint + unit tests + a debug build on every push/PR) was built during Phase 4, not held for Phase 13, on the same "why wait" logic as Phase 2's distance-sort pull-forward in `docs/CLAUDE.md` §2.2. Reasoning: once more than one person/session is touching this repo, "does it still build" is worth knowing on every push, not just at hardening time. What's genuinely still Phase 13's job: **CD** (signed release builds, Play Store upload automation) — that needs a real signing keystore and store listing that don't exist yet, so it stays deferred on purpose, not an oversight.

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
