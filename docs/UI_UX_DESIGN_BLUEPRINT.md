# GLIDE — Modern UI/UX Design Blueprint & Specification
> Inspired by top-tier modern consumer apps (Zomato, Myntra, Swiggy, Airbnb)
> Target Platform: Expo SDK 54 / React Native (iOS & Android)

---

## 1. Executive Design Vision

GLIDE is transformed from a standard utility app into a **vibrant, high-polished, modern consumer experience**. Drawing design cues from industry leaders like **Zomato** (dynamic discovery, food-court-style item pickers, sticky floating action bars) and **Myntra** (sleek typography, premium card elevations, visual slot selection, polished dark/light themes), GLIDE delivers:

1. **Hyper-Scannability**: Clean visual hierarchy where pricing, ratings, slot availability, and distance are instantly readable.
2. **Tactile Haptic Motion**: Responsive micro-interactions, scale springs on press, and subtle haptic feedback (`Haptics.impactAsync`).
3. **Glassmorphism & Depth**: Multi-layered surfaces with soft translucent blurred backdrops, crisp borders, and refined drop shadows.
4. **Delightful Micro-States**: Shimmer skeleton screens, live countdown rings, pulsing instant-booking radars, and "Saved ✓" flash toasts.

---

## 2. Design System & Theme Tokens (`constants/theme.ts`)

### 2.1 Color Palette & Token System

```typescript
// Core Primary & Secondary Accent Colors
const ElectricIndigoLight = '#4F46E5'; // Modern Indigo Primary
const ElectricIndigoDark  = '#818CF8';
const RosePinkHighlight   = '#FF385C'; // Zomato/Airbnb vibrant deal/tag accent
const EmeraldSuccess      = '#10B981'; // Open status, ratings, verified badge
const AmberWarning        = '#F59E0B'; // Pending hold, low slots warning
```

#### Light Mode Palette
* **Background (`background`)**: `#F8FAFC` (Soft Slate-50 off-white, eliminates stark contrast)
* **Surface / Card (`surface`)**: `#FFFFFF` (Pure white floating cards)
* **Surface Border (`surfaceBorder`)**: `#E2E8F0` (Crisp 1px outline)
* **Text Primary (`text`)**: `#0F172A` (Deep Slate-900)
* **Text Secondary (`textMuted`)**: `#64748B` (Muted Slate-500)
* **Primary Tint (`tint`)**: `#4F46E5` (Electric Indigo)
* **Tint Surface (`tintSurface`)**: `#EEF2FF` (Soft Indigo pill backdrops)
* **Accent Highlight (`accent`)**: `#FF385C` (Rose Flame)
* **Success Tag (`successSurface`)**: `#ECFDF5` / `#10B981`
* **Warning Tag (`warningSurface`)**: `#FFFBEB` / `#F59E0B`

#### Dark Mode Palette
* **Background (`background`)**: `#0F172A` (Midnight Slate)
* **Surface / Card (`surface`)**: `#1E293B` (Elevated Card Dark)
* **Surface Border (`surfaceBorder`)**: `#334155` (Slate-700 Border)
* **Text Primary (`text`)**: `#F8FAFC` (Slate-50)
* **Text Secondary (`textMuted`)**: `#94A3B8` (Slate-400)
* **Primary Tint (`tint`)**: `#818CF8` (Soft Glowing Indigo)
* **Tint Surface (`tintSurface`)**: `#1E1B4B` (Deep Indigo Glow)
* **Accent Highlight (`accent`)**: `#FF5A79`
* **Success Tag (`successSurface`)**: `#064E3B` / `#34D399`
* **Warning Tag (`warningSurface`)**: `#451A03` / `#FBBF24`

---

### 2.2 Typography Scale & Fonts

Inspired by SF Pro Display & Plus Jakarta Sans:

| Style Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `DisplayHero` | 32px | `800` (ExtraBold) | 38px | Onboarding headlines, Instant Booking hero |
| `ScreenTitle` | 24px | `700` (Bold) | 30px | Screen headers, Salon names |
| `SectionHeader` | 18px | `700` (Bold) | 24px | Home feed sections ("Recommended Salons") |
| `CardTitle` | 16px | `600` (SemiBold) | 22px | Salon card title, Service item name |
| `BodyText` | 14px | `400` (Regular) | 20px | Descriptions, addresses, timing details |
| `BadgeText` | 12px | `600` (SemiBold) | 16px | Rating chips, slot tags, status pills |
| `MicroText` | 10px | `500` (Medium) | 14px | Sub-captions, terms, timestamp labels |

---

### 2.3 Elevation, Shadows & Glassmorphism

```typescript
export const Elevation = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#4F46E5', // Glowing colored shadow for primary CTAs
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 16,
    elevation: 8,
  },
};
```

---

## 3. Core Component Library Design (Zomato & Myntra Styled)

### 3.1 Hyper-Local Salon / Barber Card (`components/shop-card.tsx`)

A multi-layered modern card with visual badges and instant scannability:

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  [ Hero Image 16:9 ]                                    │ │
│ │                                                         │ │
│ │  [★ 4.8 (120+)] (Emerald Pill)    [0.8 km] (Blur Pill) │ │
│ │                                   [♡] (Floating Heart)  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  Luxe Blade Salon & Barbering        [NEXT SLOT: 10 MINS]   │
│  📍 100ft Road, Indiranagar • ₹₹           (Green Glow)     │
│                                                             │
│  🏷️ Haircut · Beard Styling · Facial · Head Massage         │
│  ─────────────────────────────────────────────────────────  │
│  ⚡ Instant Booking Available  |  ⭐ Top Rated Partner      │
└─────────────────────────────────────────────────────────────┘
```

#### Key Visual Highlights:
* **Rating Pill**: Solid Emerald Green (`#10B981`) backdrop with crisp white text (`★ 4.8`).
* **Distance & Price Pill**: Semi-transparent glassmorphic pill (`rgba(0,0,0,0.5)` with `BlurView`) overlaid on the top-right of the hero image.
* **Favorite Heart**: Floating white circle button with spring animation heart state.
* **Next Slot Tag**: Live indicator pill in light green (`#ECFDF5`) with a pulsing green status dot (`#10B981`).

---

### 3.2 Service Item Selector Card (`components/service-item-card.tsx`)

Modeled directly after **Zomato's Food Dish Selector**:

```
┌─────────────────────────────────────────────────────────────┐
│  ✂️ Signature Grooming Package                ┌───────────┐  │
│  ⭐ POPULAR                                  │  [Service │  │
│  ₹499  • 45 mins                            │   Image]  │  │
│                                              └───────────┘  │
│  Includes Haircut, Beard Trim, Shampoo,                     │
│  and Head Massage.                           ┌───────────┐  │
│                                              │   + ADD   │  │
│                                              └───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Interactive Behavior:
* Default state: White pill button with bold blue text `+ ADD` and subtle border shadow.
* Active state: On tap, morphs smoothly into `-  1  +` quantity/selection control with haptic feedback.
* Bottom Sheet Trigger: Tapping the service info opens a quick detail drawer showing exact step-by-step breakdown.

---

### 3.3 Sticky Bottom Checkout Bar (`components/floating-cart-bar.tsx`)

Zomato-style floating pill bar pinned above the tab bar or screen bottom:

```
┌─────────────────────────────────────────────────────────────┐
│  🛍️  2 Services | ₹848                 Select Time Slot ➔   │
│      Haircut + Beard Trim              (Electric Indigo CTA)│
└─────────────────────────────────────────────────────────────┘
```

* **Styling**: Floating rounded pill (`borderRadius: 16`), elevated with Indigo glow shadow, 16px horizontal margins.
* **Micro-interaction**: Slides up smoothly (`Reanimated.withSpring`) as soon as 1 or more services are selected.

---

### 3.4 Date & Time Slot Grid (`components/slot-picker.tsx`)

Myntra-style visual slot selection widget:

```
Date Selector (Horizontal Scroll):
 [ TODAY, AUG 26 ]   [ WED, AUG 27 ]   [ THU, AUG 28 ]
  (Indigo Selected)     (Surface Card)    (Surface Card)

Time Slots (Grouped by Period):
 🌅 MORNING
 [ 09:00 AM ]   [ 10:00 AM ]   [ 11:30 AM ]
 (Available)     (Selected)     (SOLD OUT - Muted)

 ☀️ AFTERNOON
 [ 01:00 PM ]   [ 02:30 PM ]   [ 04:00 PM ]
```

* **Selection State**: Active slot tile flips to Electric Indigo gradient fill with white bold text.
* **Low Slots Warning**: Amber pill tag ("Only 1 barber free") above high-demand slots.

---

## 4. Screen-by-Screen Detailed UX Breakdown

### 4.1 Onboarding & Auth Screen (`(auth)/phone.tsx` & `verify.tsx`)

* **Hero Banner**: Sleek vector illustration / dark gradient splash showcasing a stylish modern barber chair with glowing indigo neon ring.
* **Phone Number Input**:
  * Country flag indicator (`🇮🇳 +91`) with clean vertical separator.
  * Floating label text input with glowing border focus state (`#4F46E5`).
  * Auto-advance trigger when 10 digits are typed.
* **OTP Verification**:
  * 6 individual rounded box inputs with smooth focus animation.
  * Auto-submit on typing the 6th digit.
  * Live countdown pill: `Resend code in 0:24` with disabled state, re-enabling smoothly when timer reaches zero.

---

### 4.2 Customer Home / Discovery Feed (`(customer)/index.tsx`)

* **Top Navigation Bar**:
  * **Location Header**: Pin icon 📍 + "Current Location" label with subtitle ("Indiranagar, Bengaluru ▾") that triggers location sheet on press.
  * **Notification Bell**: Top right icon with active badge dot (`🔴`).
* **Search & Filter Bar**:
  * Search bar input ("Search salons, barbers, services...") with magnifying glass icon and clear `X` button.
  * Filter button on right: Opens bottom sheet for sorting (Distance, Rating, Price, Instant Booking).
* **Category Pill Carousel**:
  * Horizontal scrolling circular icon pills: `✂️ Haircut`, `🧔 Beard`, `🎨 Color`, `💆 Spa`, `✨ Facial`, `💅 Nails`.
* **Promotional Banner Carousel**:
  * Full-width promo cards: *"First Booking Offer: 20% OFF with code GLIDE20"*, *"Instant Barber in 15 Mins"*.
* **Instant Booking Pulse Card**:
  * High-visibility card with a pulsing radar wave effect: *"Need a haircut right now? Tap for Instant Barber Match ⚡"*.
* **Salon List Section**:
  * Section header: *"Salons Near You (12)"* with toggle layout (List vs Map view switch).
  * Rendered using `ShopCard` with Skeleton shimmer loader while data fetches.

---

### 4.3 Salon Detail & Service Menu Screen (`(customer)/shop/[id].tsx`)

* **Parallax Header Hero**:
  * High-res imagery with parallax scroll shrink effect (`ParallaxScrollView`).
  * Back button floating over dark gradient image protection tint.
  * Share & Favorite buttons top right.
* **Salon Metadata Strip**:
  * Salon Name in 24px Bold (`ScreenTitle`).
  * Rating (`★ 4.8`), total reviews (`128 reviews`), opening status badge (`🟢 OPEN NOW`).
  * Address with "Navigate 🗺️" and "Call 📞" quick action buttons.
* **Stylist / Barber Selector Bar**:
  * Horizontal avatar scroll: `[Any Barber (Fastest)]`, `[Alex ⭐ 4.9]`, `[Marco ⭐ 4.8]`.
* **Service Tabs & Search**:
  * Sticky tab bar: `[All Services]`, `[Hair]`, `[Beard]`, `[Combos]`, `[Facials]`.
* **Service Cards & Floating Cart Bar**:
  * Service items rendered via `ServiceItemCard`.
  * Floating Sticky Cart Bar appears at bottom on selecting services.

---

### 4.4 Booking Confirmation & Payment Drawer (`(customer)/checkout.tsx`)

* **Order Summary Card**:
  * Salon name, selected barber, date & time slot.
  * Itemized bill split: Service total, Taxes & convenience fee, Promo discount code input field with "APPLY" action.
  * Total Payable in large bold font (`₹649`).
* **Payment Method Selector**:
  * UPI (GPay, PhonePe, Paytm) with quick one-tap checkout.
  * Credit/Debit Cards & Netbanking via Razorpay SDK integration.
* **CTA Button**:
  * High-visibility full-width button: `Hold Slot & Pay ₹649 🔒`.
  * Includes haptic feedback trigger on tap.

---

### 4.5 Live Booking Tracker & Verification Screen (`(customer)/booking/[id].tsx`)

* **Real-time Stepper Tracker**:
  ```
  (✓) Draft  ──  (✓) Accepted  ──  (🟢) Confirmed  ──  ( ) In Service  ──  ( ) Done
  ```
* **Arrival Verification Card**:
  * High-contrast QR code generated for shop scanner.
  * Fallback option: Large, clear 6-digit text code (`849 201`) with "Tap to Copy" button.
* **Live Slot Hold Ring**:
  * Animated circular SVG countdown ring showing remaining slot hold time (e.g. `08:42 mins left to arrive`).

---

### 4.6 Partner App / Barber Owner Dashboard (`(partner)/index.tsx`)

* **Emergency Pause / Open Toggle (Top Header)**:
  * Full-width prominent toggle card:
    * **OPEN STATE**: Vibrant Emerald backdrop (`#10B981`), "SHOP IS ACCEPTING BOOKINGS 🟢".
    * **CLOSED / PAUSED STATE**: Crimson backdrop (`#EF4444`), "SHOP IS CLOSED / PAUSED 🔴".
  * Direct one-tap execution with instant haptic vibrate feedback.
* **Live Booking Request Cards**:
  * Instant alert card with sound & haptics when new booking arrives.
  * Accept / Decline action buttons with 60-second response countdown ring.
* **Quick Shop Stats Widget**:
  * 3 metric cards: `Today's Bookings (8)`, `Revenue (₹3,450)`, `Active Barbers (3/4)`.
* **Services Management Tab**:
  * Toggle switch on each service row (`is_active`) to temporarily pause specific services when supplies run out.

---

## 5. Micro-Animations, Motion & State Design

### 5.1 Button & Card Press Dynamics
* **Scale Spring**: On `onPressIn`, apply `transform: [{ scale: 0.97 }]` via React Native Reanimated.
* **Haptics Integration (`lib/haptics.ts`)**:
  * Primary Button Tap -> `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`
  * Tab Bar Switch -> `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
  * Open/Close Toggle -> `Haptics.notificationAsync(NotificationFeedbackType.Success)`

---

### 5.2 Skeleton Shimmer Loader Specifications
* Built natively using `View` & `themed-view` token colors for ultra-lightweight execution without third-party heavy dependencies.
* Smooth pulsing opacity (`opacity: 0.4 -> 1.0 -> 0.4`) loop on placeholder blocks for card images, title lines, and rating badges.

---

### 5.3 Feedback Toasts & Confetti
* **"Saved ✓" Toast**: Animated top floating pill when partner updates service price or shop info.
* **Booking Success Flash**: Confetti pop animation and success checkmark check when booking is confirmed.

---

## 6. Implementation Roadmap for UI/UX Enhancement

1. **Theme Token Refinement**: Update `constants/theme.ts` with complete light/dark token scale, elevation presets, and color accents.
2. **Reusable UI Library**: Create `components/shop-card.tsx`, `components/service-item-card.tsx`, `components/floating-cart-bar.tsx`, and `components/slot-picker.tsx`.
3. **Screen Revamps**:
   * Refactor `(customer)/index.tsx` into Zomato-style feed.
   * Upgrade `(customer)/shop/[id].tsx` with sticky cart bar and barber selection.
   * Polish `(partner)/index.tsx` with top status banner toggle.
4. **Haptics & Animation Polish**: Wire `expo-haptics` and Reanimated transitions across all primary touchpoints.

---
*Documented for GLIDE engineering team as the official UI/UX design benchmark.*
