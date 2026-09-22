# GLIDE — MVP Build Progress

Quick-reference checklist for where the native Android rebuild actually stands, phase by phase. Full detail (what's built, security checklist, test status, what's verified vs. still needs a real device) for each phase lives in [`docs/NATIVE_ANDROID_PLAN.md`](docs/NATIVE_ANDROID_PLAN.md) section 5 — this file is the at-a-glance version, that one is the source of truth.

**Stack:** Kotlin + Jetpack Compose (`android-native/`) + Supabase (Postgres/RLS/Auth/Realtime/Edge Functions) + Razorpay. No Expo/React Native — that stack was removed once the native rebuild reached this point. See `docs/NATIVE_ANDROID_PLAN.md` section 1 for the decision record.

| Phase | What it is | Status |
|---|---|---|
| 0 | Native project bootstrap (Gradle, Hilt, Compose, edge-to-edge) | ✅ Builds clean |
| 1 | Auth — phone OTP, session storage, role-routed navigation | ✅ Builds clean, 14 unit tests |
| 2 | Customer discovery — shop list, distance sort | ✅ Builds clean, 6 unit tests |
| 3 | Partner basics — shop profile, opening hours, services/barbers CRUD | ✅ Builds clean, 22 unit tests |
| — | Phone UX (+91-only entry), dev sign-in bypass (no SMS cost while testing), free auto-OTP read, UI/UX pass on every screen above | ✅ Done, on top of Phases 1–3 |
| 4 | Slot booking — multi-service cart, slot picker, `create-booking`/`accept-booking`/`reject-booking`, partner request queue | ✅ Builds clean, 21 unit tests |
| 5 | Payments — native Razorpay SDK, `create-payment-order`, webhook-driven confirmation | ⬜ Not started |
| 6 | Arrival verification — QR/6-digit code, CameraX + ML Kit | ⬜ Not started |
| 7 | Cancellations & automatic refunds | ⬜ Not started |
| 8 | Notifications — Realtime + FCM | ⬜ Not started |
| 9 | Instant Booking — broadcast + atomic first-accept | ⬜ Not started |
| 10 | Razorpay Route payouts | ⬜ Not started |
| 11 | Analytics | ⬜ Not started |
| 12 | Admin dashboard (separate Next.js web app — not part of the mobile client) | ⬜ Not started |
| 13 | Hardening & release prep | ⬜ Not started |

**CI:** `.github/workflows/android-ci.yml` runs unit tests + a debug build on every push/PR (pulled forward from Phase 13 — see the amendment note there). No CD yet — that needs a real release keystore and Play Store listing, still Phase 13's job.

**Every phase through 5 reuses the existing Supabase backend as-is** — same schema, same RLS, same Edge Functions the Expo app used. Phases 6+ are net-new on both the backend and the client (see `docs/NATIVE_ANDROID_PLAN.md` section 2 for why that split matters).

**What "done" means here, precisely:** every phase above has a JVM unit test suite (fakes, no device) that passes, and the app builds/installs (`./gradlew assembleDebug` / `installDebug`) — that's what "✅ Builds clean" claims, no more. On-device verification (does OTP actually round-trip, does the UI actually look right, does RLS actually hold from this client) is a separate, still-outstanding checklist per phase — see the "Not yet verified" notes in `docs/NATIVE_ANDROID_PLAN.md` before treating any phase as fully closed.

**Next up:** Phase 5 (Payments — native Razorpay SDK checkout).
