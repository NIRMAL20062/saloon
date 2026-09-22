# GLIDE — Native Android Technical Spec

> Companion to `docs/NATIVE_ANDROID_PLAN.md` (read that first for the decision record and phase-by-phase plan). This doc is the technical reference: dependencies, module layout, domain models, design tokens, and the daily dev workflow. Consolidated from `ANDROID_STUDIO_PDA.md`, with corrections noted inline.

---

## 1. Gradle version catalog (`gradle/libs.versions.toml`)

> **Verified against this machine's real toolchain**, not guessed: Android Studio's own project wizard (a throwaway stub it created independently) had already resolved AGP 9.3.2 against Gradle 9.5.0 and JDK 25 on this box, and the installed SDK only has platforms 36/37 (no 35). The catalog below is what actually built clean (`./gradlew :app:assembleDebug` → `BUILD SUCCESSFUL`), not the placeholder versions an earlier draft of this doc guessed at. Two corrections that matter beyond version numbers:
> - **`compileSdk`/`targetSdk` are 37, not 35** — the Compose/AndroidX library versions current as of this build require it; 35 isn't even installed on this SDK.
> - **AGP 9.x has Kotlin support built in.** Do not apply `org.jetbrains.kotlin.android` as a separate plugin — AGP now errors with "no longer required... since AGP 9.0" if you do. Only `org.jetbrains.kotlin.plugin.compose` (the Compose compiler plugin) is still applied separately. The old `kotlinOptions { jvmTarget = ... }` DSL block is gone with it; `compileOptions { sourceCompatibility / targetCompatibility }` in the `android {}` block is what controls this now.
>
> If you're building on a different machine with an older SDK/toolchain, these exact numbers may need to shift again — the two bullets above (no separate kotlin-android plugin, compileSdk driven by what your Compose version actually requires) are the durable lessons, not the literal version strings.

```toml
[versions]
agp = "9.3.2"
kotlin = "2.4.20"
ksp = "2.3.12"
composeBom = "2026.09.00"
coreKtx = "1.19.0"
lifecycle = "2.11.0"
activityCompose = "1.13.0"
navigation = "2.9.0"
hilt = "2.60.1"
hiltNavigationCompose = "1.4.0"
supabase = "3.1.1"
ktor = "3.1.0"
coil = "3.1.0"
razorpay = "1.6.38"
playServicesLocation = "21.3.0"
camerax = "1.4.1"
mlkitBarcode = "17.3.0"
biometric = "1.2.0-alpha05"
kotlinxSerialization = "1.8.0"
kotlinxCoroutines = "1.10.1"
datastore = "1.1.2"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycle" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigation" }

androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-compose-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-compose-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-compose-material3 = { group = "androidx.compose.material3", name = "material3" }

hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
androidx-hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version.ref = "hiltNavigationCompose" }

supabase-gotrue = { group = "io.github.jan-tennert.supabase", name = "gotrue-kt", version.ref = "supabase" }
supabase-postgrest = { group = "io.github.jan-tennert.supabase", name = "postgrest-kt", version.ref = "supabase" }
supabase-realtime = { group = "io.github.jan-tennert.supabase", name = "realtime-kt", version.ref = "supabase" }
supabase-storage = { group = "io.github.jan-tennert.supabase", name = "storage-kt", version.ref = "supabase" }
ktor-client-android = { group = "io.ktor", name = "ktor-client-android", version.ref = "ktor" }

camera-core = { group = "androidx.camera", name = "camera-core", version.ref = "camerax" }
camera-camera2 = { group = "androidx.camera", name = "camera-camera2", version.ref = "camerax" }
camera-lifecycle = { group = "androidx.camera", name = "camera-lifecycle", version.ref = "camerax" }
camera-view = { group = "androidx.camera", name = "camera-view", version.ref = "camerax" }
mlkit-barcode-scanning = { group = "com.google.mlkit", name = "barcode-scanning", version.ref = "mlkitBarcode" }

coil-compose = { group = "io.coil-kt.coil3", name = "coil-compose", version.ref = "coil" }
coil-network-ktor = { group = "io.coil-kt.coil3", name = "coil-network-ktor3", version.ref = "coil" }
razorpay-checkout = { group = "com.razorpay", name = "checkout", version.ref = "razorpay" }
play-services-location = { group = "com.google.android.gms", name = "play-services-location", version.ref = "playServicesLocation" }
androidx-biometric = { group = "androidx.biometric", name = "biometric", version.ref = "biometric" }
androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "kotlinxSerialization" }
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "kotlinxCoroutines" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
# No "kotlin-android" plugin — AGP 9.x has Kotlin support built in; applying it separately fails the build.
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
```

**Not included, deliberately:** Room (`androidx.room`). See §2.

---

## 2. Why no Room / offline-first for now

`ANDROID_STUDIO_PDA.md` proposed Room as a local single-source-of-truth cache with a `WorkManager` sync engine from Phase 2 onward. That's dropped from this spec, at least initially:

- The current Expo app has no offline-first layer either, and nothing in real usage so far has shown it's needed.
- It's a meaningfully bigger architecture (local schema, DAOs, conflict resolution, sync engine) than the phase it would land in actually requires — direct Supabase Postgrest calls are enough to reach parity.
- Per the plan doc's ground rules: don't build later-phase infrastructure early "since we'll need it anyway."

If real testing surfaces a concrete problem (e.g. a shop's flaky connectivity making the live experience unusable), revisit this as its own scoped decision — not something to silently add back in.

---

## 3. Module / directory structure

```
com.glide.app/
├── GlideApplication.kt             # @HiltAndroidApp
├── MainActivity.kt                 # enableEdgeToEdge() + AppNavHost
│
├── core/
│   ├── common/                     # Result<T>/DataResult<T>, dispatchers
│   ├── designsystem/               # Color.kt, Theme.kt, Type.kt, Shape.kt — see §4
│   ├── ui/                         # GLButton, GLTextField, GLCard, GLStatusBadge, GLShimmer
│   ├── datastore/                  # SessionManager (encrypted, DataStore-backed)
│   ├── network/                    # Supabase client singleton, Ktor config
│   └── location/                   # LocationTracker, Haversine distance util
│
├── domain/
│   ├── model/                      # Shop, Booking, Service, Barber, BookingStatus
│   └── usecase/                    # CreateBookingUseCase, VerifyArrivalUseCase, ...
│
├── data/
│   ├── repository/                 # Repository implementations
│   └── remote/                     # Supabase DTOs, Edge Function calls
│
├── di/                             # Hilt modules
├── navigation/                     # Type-safe Destinations (Nav Compose 2.8+, @Serializable)
└── presentation/
    ├── auth/
    ├── customer/
    │   ├── explore/ shopdetails/ booking/ checkout/ history/
    └── partner/
        ├── queue/ shopsetup/ catalog/ barbers/ verification/
```

Create folders as their phase arrives (matches `docs/NATIVE_ANDROID_PLAN.md` ground rule #7) — an empty `presentation/instant/` sitting there from Phase 1 is clutter, not future-proofing.

---

## 4. Design tokens — fixed, light-only, per role

**Hard rule, unconditional: no dark mode, ever, for either app.** No `isSystemInDarkTheme()`, no dark `ColorScheme`, no `@Preview(uiMode = UI_MODE_NIGHT_YES)`. This corrects `ANDROID_STUDIO_PDA.md`, which incorrectly specified a "Quiet Luxury dark & light palette" and asked for dark-mode previews on every component — that directly violates `docs/THEME_AND_ROLES_COLOR_GUIDE.md` and the standing product decision. Every `@Preview` is light-mode only.

Exact tokens, from `docs/THEME_AND_ROLES_COLOR_GUIDE.md` (first hex in each pair below is the primary choice):

**Customer — "Quiet Editorial Luxury"**
| Token | Hex |
|---|---|
| Background | `#F6F1E8` |
| Surface/Card | `#FFFFFF` (hairline border `#E5DDD3`) |
| Primary/Ink | `#201A1D` |
| Muted text | `#756C70` |
| Brand accent | `#512A45` |
| Accent surface | `#F3EBF0` |
| Star rating | `#E7C45A` |
| Live/open | `#23845B` |
| Urgent/coral | `#F06F61` |

**Partner — "Emerald Business Trust"**
| Token | Hex |
|---|---|
| Background | `#F8FAFC` |
| Card surface | `#FFFFFF` (border `#E2E8F0`) |
| Primary brand | `#0D7A53` |
| Mint surface | `#EBF5F0` (border `#D1FAE5`) |
| Text primary | `#111827` |
| Text muted | `#64748B` |
| Pending alert | `#F59E0B` |
| Danger/exit | `#EF4444` (surface `#FEF2F2`) |

Never mix roles: no Partner emerald as a Customer primary color, no Customer plum as a Partner primary color. Same semantic rules as the Expo app — red is destructive-only, green is Partner-primary/success/open, amber is pending/rating.

---

## 5. Core domain models

```kotlin
package com.glide.app.domain.model

enum class BookingStatus {
    DRAFT, AWAITING_SHOP, PAYMENT_PENDING, BROADCASTING,
    CONFIRMED, CUSTOMER_ARRIVED, VERIFICATION_PENDING, VERIFIED,
    IN_SERVICE, COMPLETED,
    REJECTED, CANCELLED_BY_CUSTOMER, CANCELLED_BY_SHOP,
    SHOP_RESPONSE_EXPIRED, NO_PARTNER_FOUND, EXPIRED, NO_SHOW
}
```

Matches the existing Postgres `bookings.status` values in `docs/CLAUDE.md` §10 exactly — this is a projection of the existing schema, not a new state machine.

```kotlin
package com.glide.app.navigation

import kotlinx.serialization.Serializable

sealed interface Screen {
    @Serializable data object Login : Screen
    @Serializable data class OtpVerification(val phone: String) : Screen
    @Serializable data object CustomerHome : Screen
    @Serializable data class ShopDetails(val shopId: String) : Screen
    @Serializable data class BookingFlow(val shopId: String) : Screen
    @Serializable data class Payment(val bookingId: String, val amount: Long) : Screen
    @Serializable data class BookingTracker(val bookingId: String) : Screen
    @Serializable data object PartnerHome : Screen
    @Serializable data object RequestQueue : Screen
    @Serializable data class ArrivalScanner(val bookingId: String) : Screen
}
```

Money amounts stay integer paise end to end (`Long`), matching the existing Postgres columns — never a floating-point rupee value anywhere in the Kotlin layer.

---

## 6. Secrets & config

- `local.properties` → `BuildConfig` fields for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RAZORPAY_KEY_ID` only.
- `local.properties` is git-ignored; no key is ever typed directly into a `.kt` file.
- Everything else (service-role key, Razorpay key secret, webhook secret) stays a Supabase Edge Function env var — the Kotlin app never holds them, exactly as the Expo app never did.

---

## 7. Coding standards

1. **UDF/MVI:** every ViewModel exposes one `val uiState: StateFlow<UiState>`; UI sends events via `onEvent(UiEvent)`; collect with `collectAsStateWithLifecycle()`.
2. **Type-safe navigation only** — `@Serializable` routes, never a raw concatenated URL string.
3. **No hardcoded color hex or raw dimensions in screen composables** — always `MaterialTheme.colorScheme`/`typography`, sourced from the fixed palettes in §4.
4. **Edge-to-edge**: `Modifier.statusBarsPadding()` / `navigationBarsPadding()` / `Scaffold` inner padding, `enableEdgeToEdge()` in `MainActivity`.
5. **Every reusable component gets a `@Preview`, light mode only** (see §4 — this replaces `ANDROID_STUDIO_PDA.md`'s "preview in both light and dark" rule).

---

## 8. Daily dev workflow

### Do you need Android Studio?
- **For coding/building:** No — Kotlin can be written in any editor; `./gradlew installDebug` and `adb` handle compilation and install from the terminal.
- **For the best day-to-day loop:** Yes, recommended, for two features terminal-only work can't replicate:
  1. **Compose `@Preview`** — renders a component in a side pane without running the app.
  2. **Live Edit** — pushes small UI changes (color/text/padding/layout) to a running phone/emulator in under a second, without restarting or losing screen state.

### Three ways to see changes live
- **A — Physical phone + `scrcpy` (recommended).** USB debugging on, `scrcpy` mirrors the phone to the desktop at low latency; `./gradlew installDebug` or Android Studio's **Apply Changes** updates the app in 2–5s. This is the only workflow that exercises real camera QR scanning, real GPS, real vibration, and real Razorpay UPI end to end.
- **B — Emulator + Compose Live Edit.** A virtual device (e.g. Pixel 9 / API 35) in Android Studio's Device Manager; Live Edit injects bytecode changes instantly, similar in feel to RN Fast Refresh.
- **C — `@Preview` alone.** For isolated component work (a card, a button) with no app run needed at all:
  ```kotlin
  @Preview(showBackground = true)
  @Composable
  fun ShopCardPreview() {
      GLCard(title = "Blade & Fade Barber", distance = "1.2 km", rating = 4.8)
  }
  ```
  (Light-mode preview only, per §4 — no `uiMode = UI_MODE_NIGHT_YES` variant.)

### What to install
1. **JDK 17** — `sudo apt install openjdk-17-jdk`, or bundled with Android Studio.
2. **Android SDK & Build-Tools** — installed with Android Studio; includes `adb` and `logcat`.
3. **`scrcpy`** (optional but recommended) — `sudo apt install scrcpy`.
4. **Android Studio** — for SDK/emulator management, Live Edit, and device logs.

### Feedback loop vs. Expo, for context

| Action | Native Kotlin + Compose | Expo / React Native |
|---|---|---|
| Edit text/colors/spacing | ~1s (Live Edit / `@Preview`) | ~0.5s (Fast Refresh) |
| New screen/route | ~3–5s (incremental Gradle + `adb install`) | Instant (file-based routing) |
| Add a native SDK (Razorpay, ML Kit, camera) | Instant — one `build.gradle.kts` line | Needed a config plugin or custom dev client |
| Real hardware (camera, barcode, biometrics) | Native and accurate on any device | Required a custom EAS dev-client build |
