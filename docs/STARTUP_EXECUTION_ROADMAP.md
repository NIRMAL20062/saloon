# GLIDE — Startup Survival & Engineering Execution Roadmap
> **File:** `STARTUP_EXECUTION_ROADMAP.md`  
> **Status:** Live Operational Document  
> **Target:** 0-Failure Production Launch (Android / Supabase / Razorpay)

---

## 1. Executive Summary & Ground Reality Assessment

GLIDE has completed **Phases 1 through 5** with an exceptionally strong engineering foundation:
- **Database & Concurrency:** Zero slot collisions via Postgres `btree_gist` range exclusion constraints.
- **Financial Security:** Server-calculated integer paise amounts, raw HMAC-SHA256 Razorpay webhook verification with constant-time comparison, and idempotency tracking.
- **Access Control:** Strict Row Level Security (RLS) on all 10+ tables, no role escalation via database triggers, and hardware-backed JWT storage (`expo-secure-store`).
- **UI/UX Architecture:** Clean, distinct dual-role design systems for Customer ("Quiet Luxury") and Partner ("Emerald Business Trust").

However, salon booking startups **do not fail from code syntax errors—they fail from ground-level operational friction, edge cases during peak salon hours, and broken money loops.**

---

## 2. The 7 Startup-Killing Failure Scenarios & Exact Technical Fixes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THE 7 CRITICAL FAILURE VECTORS                        │
├───────────────────────────────────┬─────────────────────────────────────────┤
│ 1. The Busy Barber (Missed Alert) │ 5. Refund Churn & Dispute Chargebacks   │
│ 2. The Ghost Customer (No-Show)   │ 6. Partner Payout Distrust (Payout Lag) │
│ 3. Phone Died Mid-Payment         │ 7. Underground Salon Connectivity Drop  │
│ 4. Double Booking Concurrency Race│                                         │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

### Scenario 1: The Busy Barber (Missed Acceptances)
* **The Reality:** Suresh is giving a haircut with wet hands and clippers buzzing. Rohan books a slot with a 100-second acceptance window. Suresh's phone is in his pocket. He misses the timer. Rohan's booking expires. Rohan thinks GLIDE is dead and deletes the app.
* **The Fix (Phase 6 & 8):**
  1. **High-Priority Expo Push Notifications:** Triggered by database webhook on new `awaiting_shop` booking.
  2. **Partner Audio Chime:** Looping ringtone inside the Partner app until accepted or rejected.
  3. **Fallback SMS / WhatsApp Alert:** For high-value bookings if unacknowledged after 45 seconds.

---

### Scenario 2: The Ghost Customer & "I Was There" Disputes
* **The Reality:** A customer books, pays, but doesn't show up. Later, the customer demands a refund claiming "The shop was closed." Alternatively, a rogue barber marks a booking "Completed" without the customer ever arriving to pocket payouts.
* **The Fix (Phase 6 — In-Person Arrival Verification):**
  1. Service **cannot** start without verification:
     - **Path A:** Customer shows dynamic QR code (containing signed JWT with booking ID + nonce). Partner scans with camera.
     - **Path B:** Customer gives a 6-digit numeric OTP. Partner types it in.
  2. Server stores `code_hash` (SHA-256), never plaintext.
  3. Maximum 5 failed verification attempts before 15-minute lockout to block brute-forcing.
  4. Only successful verification timestamps `verified_at` and unlocks "Start Service" and "Complete Service".

---

### Scenario 3: Network Drops Mid-Payment / Phone Battery Dies
* **The Reality:** Rohan taps "Pay ₹200", enters UPI PIN in GPay, money is deducted from his bank, but before redirecting back to GLIDE, his phone battery dies or 4G drops. Rohan reopens the app in panic thinking his ₹200 is gone.
* **The Fix (Already Built + Reconciliation):**
  1. **Server-to-Server Webhook is the Only Truth:** Razorpay calls `razorpay-webhook` directly. Database updates `bookings.status = 'confirmed'` and `payments.status = 'captured'` regardless of client connection.
  2. **App Startup Auto-Reconcile:** When customer opens the app, any `payment_pending` booking is checked against Supabase / Razorpay API to immediately show "Payment Confirmed!" with green badge.

---

### Scenario 4: Concurrency Race During Saturday 11:00 AM Rush
* **The Reality:** 5 customers simultaneously try to book Suresh at 11:00 AM on Saturday.
* **The Fix (Already Hardened in Migration 0008 & 0012):**
  1. PostgreSQL Exclusion Constraint (`bookings_no_barber_overlap` using `tstzrange` and `&&` operator) prevents two active holds or confirmed bookings for the same barber from existing at the database engine level.
  2. Exactly one transaction succeeds; the other 4 receive clean HTTP `409` ("That slot was just taken") and UI immediately updates with next available slot.

---

### Scenario 5: Automatic Refunds on Rejection or Expiry
* **The Reality:** In Instant Booking or pre-authorized payments, if a shop rejects or the 100s window lapses, manual refund handling is fatal. A customer waiting 3 days for ₹300 will never use the app again.
* **The Fix (Phase 7 — Automated Refund Engine):**
  1. Edge Function `process-refund` triggers Razorpay Instant Refund API immediately when status transitions to `rejected` or `expired` post-payment.
  2. `refunds` table tracks `razorpay_refund_id`, `amount`, `status`, and `processed_at`.
  3. In-app UI updates to "Refund Processed (Ref: XYZ)" in under 5 seconds.

---

### Scenario 6: Partner Trust & Instant Split Payouts
* **The Reality:** Shop owners will refuse to use GLIDE if their money is held for 14 days or if calculations are opaque.
* **The Fix (Phase 10 — Razorpay Route Integration):**
  1. Each partner links their bank account/UPI via Razorpay Linked Account during onboarding.
  2. When payment captures, Razorpay Route automatically splits:
     - 90% transferred directly to Partner's bank account.
     - 10% retained in GLIDE's primary account as platform commission.
  3. Partner dashboard displays clean, real-time earnings ledger (`shop_earnings`).

---

### Scenario 7: Basement Salons with Zero Mobile Signal
* **The Reality:** Many salons in Indian cities are located in basements or dense alleyways with 1-bar connectivity.
* **The Fix (Offline Resilience):**
  1. Customer QR Code contains an offline cryptographic token (signed with asymmetric key / short-lived timestamp).
  2. Verification code is 6 digits: the partner can enter it even on slow 2G connections with automatic retry queue.

---

## 3. Step-by-Step Execution Sequence

```
[ NOW: Phase 5 Complete ]
         │
         ▼
[ NEXT: Phase 6 ] ──► In-Person Verification (QR Scanner + 6-digit OTP + Database State Machine)
         │
         ▼
[ Phase 7 ]       ──► Automated Cancellation & Razorpay Refund Engine
         │
         ▼
[ Phase 8 ]       ──► Supabase Realtime Subscriptions (Instant UI updates without polling)
         │
         ▼
[ Phase 9 ]       ──► Instant Booking Engine (3km Radar Broadcast + Atomic First-Accept)
         │
         ▼
[ Phase 10 ]      ──► Automated Partner Payouts (Razorpay Route Split)
         │
         ▼
[ Phase 11 & 12 ] ──► Analytics, Admin Web Dashboard, Exception Triage
         │
         ▼
[ Phase 13 ]      ──► Full Hardened Scenario Matrix & Production Go-Live Audit
```

---

## 4. Ground Rules for Execution

1. **Explicit Permission Required:** Never run `git commit`, `git push`, or modifying deployment commands without asking first.
2. **Shift-Left Testing:** Every status transition and payment edge case must have an automated Jest unit/integration test before moving to the next phase.
3. **No Premature Scaffolding:** Build Phase 6 completely (tables, verification Edge Function, tests, UI verification modal) before touching Phase 7.
4. **Follow Design System Tokens:** Strictly maintain separation between Customer App (Luxury Cream/Noir) and Partner App (Forest Emerald/Mint) per `docs/THEME_AND_ROLES_COLOR_GUIDE.md`.
