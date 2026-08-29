# GLIDE 💈 ,

> **On-Demand Barber & Salon Booking Platform for Android**  
> Built with Expo SDK 54 (React Native + TypeScript), Supabase (PostgreSQL, RLS, Realtime, Edge Functions), and Razorpay.

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

GLIDE provides two tailored user experiences within a single unified React Native codebase using role-based routing:

```
                          ┌──────────────────────┐
                          │  Supabase Auth (OTP) │
                          └──────────┬───────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
           [ Customer Experience ]         [ Partner Experience ]
             (app/(customer)/...)            (app/(partner)/...)
```

### 💇 Customer App
- **Geo-Discovery**: Browse nearby verified salons with live distance calculations (PostGIS) and open/closed operating status.
- **Slot Booking**: Select specific haircut/styling services, choose a preferred barber, and pick available time slots.
- **Real-Time Booking Status**: Live countdown timer while waiting for shop confirmation.
- **Razorpay Checkout**: Seamless in-app payment via UPI, Cards, or NetBanking once the shop confirms.
- **Saved Shops & Profile**: Manage favorite salons and view full booking history.

### ✂️ Partner / Salon Owner App
- **Live Booking Queue**: Instant incoming booking alerts with quick **Accept** or **Reject** actions before expiration.
- **Shop Profile & Geolocation**: Manage shop address, GPS coordinates, and weekly operating hours.
- **Services Catalog**: Configure service menu with pricing and duration.
- **Staff / Barbers**: Add and manage individual barbers and their active availability.

> 🎨 **Design System & Color Guide**: Full dual-role color palettes, typography, and component specifications are documented in [`docs/THEME_AND_ROLES_COLOR_GUIDE.md`](./docs/THEME_AND_ROLES_COLOR_GUIDE.md).

---

## ⚡ 3. Why This Tech Stack?

| Technology | Role | Why It Was Chosen |
| :--- | :--- | :--- |
| **Expo SDK 54 + React Native 0.81** | Mobile Frontend | Modern mobile framework with fast performance, typed file-based navigation ([Expo Router](https://docs.expo.dev/router/introduction/)), smooth animations ([Reanimated](https://docs.swmansion.com/react-native-reanimated/)), and native haptic feedback. |
| **TypeScript** | Language | Strict end-to-end type safety across mobile components, database definitions, and backend edge functions. |
| **Supabase (PostgreSQL + PostGIS)** | Database & Geo | Relational database with built-in geospatial queries (`ST_DistanceSphere` for finding nearby shops by GPS) and real-time subscription capabilities. |
| **Row Level Security (RLS)** | Data Authorization | Zero-trust security model baked directly into the database engine. Customers can only read their own data; partners can only modify their own shops. |
| **Supabase Edge Functions (Deno)** | Serverless Backend | Fast, isolated serverless functions that act as the **trust boundary**. Secret keys (Razorpay secret, Supabase service-role) never touch the mobile device. |
| **Razorpay** | Payments | Full-featured payment gateway for Indian payment methods (UPI, Cards, NetBanking) with webhooks and signature verification. |
| **`expo-secure-store`** | Storage | Hardware-backed encrypted storage for session tokens (JWTs) instead of insecure plaintext `AsyncStorage`. |

---

## 🏛️ 4. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Client (Expo 54)                  │
│   • React Native • TypeScript • Expo Router 6               │
│   • Quiet Luxury Dark Theme • expo-secure-store • Haptics    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Supabase Client SDK (Anon Key + JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                         │
│  ┌────────────────────────┐    ┌──────────────────────────┐ │
│  │ PostgreSQL + PostGIS   │    │ Row Level Security (RLS) │ │
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
├── app/                        # Expo Router file-based screens
│   ├── (auth)/                 # Login, OTP verification, Role selection
│   ├── (customer)/             # Customer tabs (Explore, Saved, Profile, Book, Pay)
│   ├── (partner)/              # Partner dashboard (Queue, Barbers, Services)
│   └── _layout.tsx             # Root routing and AuthProvider wrapper
├── components/                 # Reusable UI components (ShopCard, Badges, Modals)
├── constants/                  # Color tokens (Quiet Luxury palette) and themes
├── features/                   # Frontend domain APIs (shops, bookings, payments, auth)
├── hooks/                      # Custom React hooks (useThemeColor, useColorScheme)
├── lib/                        # Client libraries (Supabase client, Location, Haptics)
├── supabase/
│   ├── functions/              # Deno Edge Functions (Serverless backend & Webhooks)
│   │   ├── create-booking/     # Validates slots & creates server-locked bookings
│   │   ├── accept-booking/     # Partner acceptance transition
│   │   ├── reject-booking/     # Partner rejection transition
│   │   ├── create-payment-order/ # Server-side Razorpay order creation
│   │   ├── razorpay-webhook/   # Idempotent signature-verified payment confirmation
│   │   └── expire-bookings/    # Auto-expiry for stale booking requests
│   └── migrations/             # Incremental PostgreSQL database migrations
├── CLAUDE.md                   # Detailed engineering roadmap and architecture doc
└── package.json                # Project scripts and dependencies
```

---

## 🚀 6. Getting Started & Local Setup

### Prerequisites
- **Node.js** (v20 or newer recommended)
- **npm** or **yarn**
- **Expo Go** app on your physical mobile device (Android/iOS) or an Android Emulator / iOS Simulator.
- A **Supabase** project (free tier works great).
- A **Razorpay** test account (for payment testing).

---

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/NIRMAL20062/saloon.git
cd saloon
npm install
```

---

### Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your Supabase project credentials (found under **Supabase Dashboard > Project Settings > API**):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```

> [!IMPORTANT]
> Mobile environment variables in Expo must be prefixed with `EXPO_PUBLIC_`. Secret keys (like `SUPABASE_SERVICE_ROLE_KEY` and `RAZORPAY_KEY_SECRET`) must **never** be placed in `.env` or in mobile code. They are configured securely inside Supabase Edge Functions.

---

### Step 3: Set Up Database (Supabase Migrations)

Apply all SQL migrations to your Supabase project in numerical order:

```bash
# If using the Supabase CLI:
supabase db push

# Or run the files located in supabase/migrations/ in your Supabase SQL Editor:
# 0001_init.sql through 0013_resolve_security_definer_views.sql
```

---

### Step 4: Configure Supabase Edge Functions & Secrets

Set the required environment secrets on your Supabase project for Edge Functions:

```bash
supabase secrets set \
  RAZORPAY_KEY_ID="rzp_test_..." \
  RAZORPAY_KEY_SECRET="your_razorpay_secret" \
  RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"
```

Deploy the functions:
```bash
supabase functions deploy create-booking
supabase functions deploy accept-booking
supabase functions deploy reject-booking
supabase functions deploy create-payment-order
supabase functions deploy razorpay-webhook
supabase functions deploy expire-bookings
```

---

### Step 5: Start the App

```bash
npx expo start
```

- **Physical Device (Recommended)**: Scan the QR code shown in your terminal using the **Expo Go** app.
- **Android Emulator**: Press `a` in the terminal.
- **Web Preview**: Press `w` in the terminal.

---

## 🧪 7. Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run start` | Starts the Expo development server. |
| `npm run android` | Starts Metro bundler and opens on connected Android device/emulator. |
| `npm run ios` | Starts Metro bundler and opens on iOS simulator. |
| `npm run web` | Starts local web bundler. |
| `npm run typecheck` | Runs TypeScript compiler check (`tsc --noEmit`) without building. |
| `npm run lint` | Runs ESLint on project files. |
| `npm test` | Runs Jest unit and integration tests. |

---

## 🔒 8. Security & Integrity Guarantees

1. **Server-Authoritative Money & State**: The mobile client is untrusted. Service prices, slot validation, and state machine transitions occur solely within Supabase Edge Functions.
2. **Idempotent Webhooks**: All Razorpay payment webhooks use SHA-256 HMAC signature verification and handle duplicate notifications safely without double-crediting.
3. **Audit Trails**: Every booking status transition writes an un-falsifiable record to the `booking_events` table.
4. **Zero-Trust RLS**: Every database table enforces Row Level Security policies to strictly isolate customer and shop owner data.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
