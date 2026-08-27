# GLIDE — Modern Luxury UI/UX Design System Blueprint
> Inspired by top-tier modern luxury brands (Calvin Klein, Saint Laurent, Gucci, Apple)
> Target Platform: Expo SDK 54 / React Native (iOS & Android)

---

## 1. Executive Design Vision & Core Architecture

GLIDE's visual experience is built around **Quiet Luxury and High-Fashion Minimalism**:

1. **Pure Monochrome Architecture**:
   - **Light Mode**: Pure Crisp White (`#FFFFFF`) background, sharp Ink Black (`#000000`) typography & primary CTAs, and silver hairline borders (`#E4E4E7`).
   - **Dark Mode**: Pitch Void Black (`#000000`) background, stark White (`#FFFFFF`) typography & CTAs, and deep graphite hairline borders (`#27272A`).
   - **Zero Unnecessary Color Clutter**: Red, green, and amber colors are strictly reserved for state indicators (`● OPEN` / `● PAUSED` / warnings).

2. **Unboxed Layouts & 1px Hairline Dividers**:
   - Replaces heavy rounded card boxes with paper-thin 1px hairline dividers (`StyleSheet.hairlineWidth`) and generous 24px/32px breathing room.

3. **3:4 Portrait Lookbook Photography**:
   - Salon hero cards use tall 3:4 portrait aspect ratio (fashion lookbook style) rather than standard 16:9 box thumbnails.
   - Clean metadata sits *unboxed below* the photo stack without overlapping floating pill badges.

4. **Wide-Tracked Editorial Typography**:
   - Brand Wordmark: `G L I D E` with wide tracking (`letterSpacing: 3px`).
   - Uppercase Category & Section Headers: `E X P L O R E`, `N E A R B Y  S A L O N S`, `T R E N D I N G  S E R V I C E S`, `Q U I C K  A C T I O N S`.

5. **100% Feature Preservation (Phases 1–4)**:
   - All interactive flows (Auth OTP, Location sorting, Radar Search, Booking checkout, QR scanner, Partner management, Opening Hours editor) remain 100% intact and functional.

---

## 2. Design System Tokens (`constants/theme.ts`)

```typescript
export const Colors = {
  light: {
    text: '#000000',
    textMuted: '#71717A',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceBorder: '#E4E4E7',
    tint: '#000000',
    tintSurface: '#F4F4F5',
    accent: '#000000',
    accentSurface: '#F4F4F5',
    icon: '#18181B',
    tabIconDefault: '#A1A1AA',
    tabIconSelected: '#000000',
    inputBackground: '#FAFAFA',
    border: '#E4E4E7',
    placeholder: '#A1A1AA',
    success: '#10B981',
    successSurface: '#ECFDF5',
    danger: '#EF4444',
    dangerSurface: '#FEF2F2',
    warning: '#F59E0B',
    warningSurface: '#FFFBEB',
    onTint: '#FFFFFF',
  },
  dark: {
    text: '#FFFFFF',
    textMuted: '#A1A1AA',
    background: '#000000',
    surface: '#09090B',
    surfaceBorder: '#27272A',
    tint: '#FFFFFF',
    tintSurface: '#18181B',
    accent: '#FFFFFF',
    accentSurface: '#18181B',
    icon: '#A1A1AA',
    tabIconDefault: '#52525B',
    tabIconSelected: '#FFFFFF',
    inputBackground: '#09090B',
    border: '#27272A',
    placeholder: '#52525B',
    success: '#10B981',
    successSurface: '#064E3B',
    danger: '#F87171',
    dangerSurface: '#451A1A',
    warning: '#FBBF24',
    warningSurface: '#451A03',
    onTint: '#000000',
  },
};
```

---

## 3. Screen & Component System Breakdown

### 3.1 Lookbook Salon Card (`components/shop-card.tsx`)
```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  [ 3:4 Portrait Lookbook Photography Image ]            │ │
│ │                                                         │ │
│ │                                   [♡] (Subtle Wishlist) │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  LUXE BARBER STUDIO                            ● OPEN       │
│  ★ 4.8  ·  0.1 KM  ·  FROM ₹300                             │
│  ─────────────────────────────────────────────────────────  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Service Item Card (`components/service-item-card.tsx`)
- Minimalist 1px hairline divider row format:
  ```
  SIGNATURE HAIRCUT                     ₹499
  45 MINS · INCLUDES WASH & STYLING     [ + ADD ]
  ```

### 3.3 Customer Feed (`app/(customer)/index.tsx`)
- **Brand Header**: `G L I D E` • `I N D I R A N A G A R`.
- **Navigation Links**: Calendar Icon (My Bookings), Wishlist Heart, Sign Out.
- **Search Input**: Unbordered minimal input with 300ms query debounce.
- **Instant Match Row**: `NEED A BARBER RIGHT NOW? (INSTANT SEARCH)` triggering `RadarSearchModal`.
- **Location Priming & Banner**: Rationale card & denied banner with tap-to-allow location.
- **Categories**: `ALL SERVICES`, `SAVED SALONS`, `HAIRCUT`, `BEARD`, `HEAD SPA`, `FACIAL & SKIN`, `COLORING`.
- **Feed**: Distance-sorted 3:4 lookbook cards and `T R E N D I N G  S E R V I C E S`.

### 3.4 Partner Hub (`app/(partner)/index.tsx`)
- **Status Bar**: `GLIDE PARTNER` • `● OPEN` switch toggle.
- **Incoming Bookings**: Counter badge linking to `/(partner)/bookings`.
- **Customer Arrival QR Scanner**: `"Scan Customer QR Code"` button triggering `QrScannerModal`.
- **Quick Action Links**: `Services & Prices →`, `Barbers & Stylists →`.
- **Shop Profile & Opening Hours**: Address/GPS updater and interactive `OpeningHoursEditor`.

---

## 4. Verification & Standards
- Clean TypeScript execution via `npm run typecheck` (Code 0).
- Haptic touch feedback (`Haptics.impactAsync`) on all interactive touchables.
- 100% preservation of all Phase 1–4 database schemas, Edge Functions, and routing paths.
