# GLIDE 💈

![Android CI](https://github.com/NIRMAL20062/saloon/actions/workflows/android-ci.yml/badge.svg)

> **On-Demand Barber & Salon Booking Platform for Android**
> Built with Kotlin + Jetpack Compose, Supabase (PostgreSQL, RLS, Realtime, Edge Functions), and Razorpay.

> **Build status:** early native rebuild — see [`PROGRESS.md`](PROGRESS.md) for exactly what's done vs. not, phase by phase.

---

## 📌 1. What is GLIDE?

GLIDE eliminates the frustration of booking haircuts and salon services—no awkward phone calls, no waiting in crowded waiting areas, and no unfulfilled promises.

### The Golden Rule of GLIDE
A booking becomes real and service can begin **only** when three independent conditions line up automatically:

```
[ 1. Shop Accepts ]  +  [ 2. Customer Pays ]  +  [ 3. Customer Verified on Arrival ]
                                     ↓
                         "START SERVICE" UNLOCKS
```

- **Shop Accepts First**: Customers are never charged for appointments a shop cannot service (e.g. sick barber, fully booked).
- **Customer Pays Upon Acceptance**: Shops are guaranteed payment before reserving high-value chair time.
- **In-Person Verification**: Service cannot be marked completed or started until the customer physically arrives and is verified (preventing fraud and no-show disputes).

---

## 👥 2. Dual-Sided Experience (Two Apps in One Codebase)

GLIDE provides two tailored user experiences within a single Kotlin/Compose codebase using role-based navigation:

```
                          ┌──────────────────────┐
                          │  Supabase Auth (OTP) │
                          └──────────┬───────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
           [ Customer Experience ]         [ Partner Experience ]
         presentation/customer/...       presentation/partner/...
```

### 💇 Customer App
- **Discovery**: Browse nearby verified salons with distance sorting and open/closed status. *(built)*
- **Slot Booking**: Select services, choose a preferred barber, and pick available time slots. *(not built yet)*
- **Real-Time Booking Status**: Live countdown while waiting for shop confirmation. *(not built yet)*
- **Razorpay Checkout**: Native in-app payment via UPI, Cards, or NetBanking once the shop confirms. *(not built yet)*

### ✂️ Partner / Salon Owner App
- **Shop Profile & Opening Hours**: Manage address, one-tap open/closed toggle, weekly hours. *(built)*
- **Services Catalog**: Configure service menu with pricing and duration. *(built)*
- **Staff / Barbers**: Add and manage individual barbers and their active availability. *(built)*
- **Live Booking Queue**: Instant incoming booking alerts with Accept/Reject. *(not built yet)*

See [`PROGRESS.md`](PROGRESS.md) for the authoritative phase-by-phase status.

> 🎨 **Design System & Color Guide**: Full dual-role color palettes are documented in [`docs/THEME_AND_ROLES_COLOR_GUIDE.md`](docs/THEME_AND_ROLES_COLOR_GUIDE.md) and implemented in `android-native/app/src/main/java/com/glide/app/ui/theme/`.

---

## ⚡ 3. Why This Tech Stack?

| Technology | Role | Why It Was Chosen |
| :--- | :--- | :--- |
| **Kotlin + Jetpack Compose** | Mobile Frontend | Native Android UI, real camera/hardware access (needed from Phase 6 onward), no cross-platform runtime tax. See `docs/NATIVE_ANDROID_PLAN.md` for the full decision record on why this replaced the earlier Expo/React Native client. |
| **Hilt** | Dependency Injection | Standard Android DI; every repository is an interface bound to a Supabase-backed implementation, so ViewModels are unit-testable against hand-written fakes. |
| **Supabase (PostgreSQL)** | Database | Relational database with real-time subscription capabilities. Unchanged since before the native rewrite — same schema, same migrations. |
| **Row Level Security (RLS)** | Data Authorization | Zero-trust security model baked directly into the database engine. Customers can only read their own data; partners can only modify their own shops. |
| **Supabase Edge Functions (Deno)** | Serverless Backend | The **trust boundary**. Secret keys (Razorpay secret, Supabase service-role) never touch the mobile device. |
| **Razorpay** | Payments | Full-featured payment gateway for Indian payment methods (UPI, Cards, NetBanking) with webhooks and signature verification. |
| **`EncryptedSharedPreferences`** | Storage | Keystore-backed encrypted storage for session tokens, never plaintext. |

---

## 🏛️ 4. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Mobile Client (Kotlin + Compose)               │
│   • Hilt DI • Fixed light-only Customer/Partner themes       │
│   • EncryptedSharedPreferences • Type-safe Navigation        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Supabase Client SDK (Anon Key + JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                         │
│  ┌────────────────────────┐    ┌──────────────────────────┐ │
│  │ PostgreSQL            │    │ Row Level Security (RLS) │ │
│  │ (Shops, Bookings, etc.)│    │ (Zero-trust user scoping)│ │
│  └────────────────────────┘    └──────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Edge Functions (Deno Serverless):                      │ │
│  │  • create-booking, accept-booking, reject-booking      │ │
│  │  • create-payment-order, razorpay-webhook              │ │
│  └────────────────────────────┬───────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────┘
                                │ Server-to-Server
                                ▼
                 ┌─────────────────────────────┐
                 │       Razorpay APIs         │
                 │   (Orders, Webhooks, Pay)   │
                 └─────────────────────────────┘
```

---

## 📂 5. Project Directory Structure

```
GLIDE/
├── android-native/                 # The mobile app (Kotlin + Jetpack Compose)
│   └── app/src/main/java/com/glide/app/
│       ├── core/                   # session, network, location, sms — infra
│       ├── domain/                 # models + repository interfaces
│       ├── data/                   # Supabase-backed repository implementations
│       ├── di/                     # Hilt modules
│       ├── navigation/             # type-safe destinations, root auth routing
│       └── presentation/           # screens + ViewModels, by feature
│           ├── auth/                customer/                partner/
├── supabase/
│   ├── functions/                  # Deno Edge Functions (Serverless backend & Webhooks)
│   │   ├── create-booking/         # Validates slots & creates server-locked bookings
│   │   ├── accept-booking/         # Partner acceptance transition
│   │   ├── reject-booking/         # Partner rejection transition
│   │   ├── create-payment-order/   # Server-side Razorpay order creation
│   │   ├── razorpay-webhook/       # Idempotent signature-verified payment confirmation
│   │   └── expire-bookings/        # Auto-expiry for stale booking requests
│   └── migrations/                 # Incremental PostgreSQL database migrations
├── docs/                           # NATIVE_ANDROID_PLAN.md, NATIVE_ANDROID_SPEC.md, design/security docs
├── PROGRESS.md                     # Phase-by-phase MVP build status
└── AGENTS.md                       # AI-assistant entry point
```

---

## 🚀 6. Getting Started & Local Setup

### Prerequisites
- **Android Studio** (or just a terminal + `adb` — Android Studio isn't required to build/install, only recommended for Compose Previews/Live Edit).
- **JDK 17+**.
- A physical Android phone with USB debugging enabled (recommended over an emulator on modest hardware), or an emulator.
- A **Supabase** project (free tier works — this is the same backend the app has always used).
- A **Razorpay** test account (for payment testing, from Phase 5 onward).

### Step 1: Clone

```bash
git clone https://github.com/NIRMAL20062/saloon.git
cd saloon/android-native
```

### Step 2: Configure local credentials

Create `android-native/local.properties` (git-ignored) with:

```properties
sdk.dir=/path/to/your/Android/Sdk
supabase.url=https://your-project-ref.supabase.co
supabase.anonKey=your-anon-or-publishable-key
```

These become `BuildConfig.SUPABASE_URL` / `BuildConfig.SUPABASE_ANON_KEY` — the only Supabase values the app ever holds. Secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`) never go here; they're Supabase Edge Function environment variables only.

### Step 3: Set up the database (Supabase migrations)

Apply all SQL migrations to your Supabase project in numerical order:

```bash
# If using the Supabase CLI, from the repo root:
supabase db push

# Or run the files in supabase/migrations/ in your Supabase SQL Editor,
# in order: 0001_init.sql through 0013_resolve_security_definer_views.sql
```

### Step 4: Build & install

```bash
./gradlew assembleDebug     # just build
./gradlew installDebug      # build + install on a connected device (adb devices to check)
adb shell am start -n com.glide.app/.MainActivity
```

### Step 5: Run the tests

```bash
./gradlew testDebugUnitTest    # JVM unit tests, no device needed
```

---

## 🧪 7. Common Gradle Tasks

| Command | Purpose |
| :--- | :--- |
| `./gradlew assembleDebug` | Build the debug APK. |
| `./gradlew installDebug` | Build and install on a connected device/emulator. |
| `./gradlew testDebugUnitTest` | Run JVM unit tests (ViewModels against fakes — no device needed). |
| `./gradlew lint` | Run Android Lint. |

---

## 🔒 8. Security & Integrity Guarantees

1. **Server-Authoritative Money & State**: The mobile client is untrusted. Service prices, slot validation, and state machine transitions occur solely within Supabase Edge Functions.
2. **Idempotent Webhooks**: All Razorpay payment webhooks use SHA-256 HMAC signature verification and handle duplicate notifications safely without double-crediting.
3. **Audit Trails**: Every booking status transition writes an un-falsifiable record to the `booking_events` table.
4. **Zero-Trust RLS**: Every database table enforces Row Level Security policies to strictly isolate customer and shop owner data.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
