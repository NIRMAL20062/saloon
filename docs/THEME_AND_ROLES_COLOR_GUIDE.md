# GLIDE — Dual-Role Design System & Color Architecture Guide
> **File:** `docs/THEME_AND_ROLES_COLOR_GUIDE.md`  
> **Audience:** AI Assistants, Core Engineers, UI/UX Designers  
> **Applies to:** Expo SDK 54 / React Native (Customer App & Partner App)

---

## 1. Executive Overview & Design Philosophy

GLIDE serves two distinct user personas through a unified mobile codebase with role-based routing:
1. **The Customer App (`app/(customer)/`)** — A modern luxury, editorial lookbook experience built for discovery, beauty, indulgence, and seamless booking.
2. **The Partner App (`app/(partner)/`)** — A high-trust, operational merchant dashboard engineered for business clarity, schedule management, quick triage, and transaction control.

Because their user goals and contexts are fundamentally different, **they must use distinct, curated color palettes and visual languages**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GLIDE DESIGN SYSTEM                             │
├──────────────────────────────────────┬──────────────────────────────────────┤
│           CUSTOMER APP               │             PARTNER APP              │
│       "Quiet Editorial Luxury"       │        "Emerald Business Trust"      │
│  Warm Cream • Noir • Deep Plum/Charcoal│  Fresh Mint • Pure White • Forest Emerald │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 2. Customer App Palette & Design Language (`app/(customer)/`)

### 2.1 Aesthetic Persona
- **Vibe:** High-fashion lookbook, quiet luxury (Saint Laurent, Aesop, Apple, Calvin Klein).
- **Visuals:** 3:4 portrait salon imagery, fine hairline dividers (`1px`), generous whitespace, elegant letter-tracked headings, and warm organic neutrals.

### 2.2 Color Tokens Matrix

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| **`Customer Background`** | `#F6F1E8` / `#FFFFFF` | Warm cream or crisp white background for an open, airy canvas |
| **`Customer Surface / Card`** | `#FFFFFF` | Clean white cards with subtle hairline borders (`#E5DDD3` / `#E4E4E7`) |
| **`Customer Primary / Ink`** | `#201A1D` / `#000000` | Deep Charcoal/Noir for primary titles, brand wordmark, and high-contrast CTAs |
| **`Customer Muted Text`** | `#756C70` / `#71717A` | Warm taupe / medium slate for subtitles, metadata, and timestamps |
| **`Customer Brand Accent`** | `#512A45` / `#2563EB` | Deep luxury plum or electric cobalt for premium highlights and selected filters |
| **`Customer Accent Surface`**| `#F3EBF0` / `#EFF6FF` | Soft plum/blue wash for active filter tags and selected categories |
| **`Customer Star Rating`** | `#E7C45A` / `#F59E0B` | Warm golden mustard for verified customer ratings |
| **`Customer Live / Open`** | `#23845B` / `#10B981` | Clean emerald for shop `● OPEN` status |
| **`Customer Urgent / Coral`**| `#F06F61` / `#EF4444` | Warm coral red for cancellation warnings, discount tags, or errors |

### 2.3 Customer Component Guidelines
- **Shop Cards:** Tall 3:4 aspect ratio portrait imagery with unboxed metadata below the photo stack.
- **Service Lists:** Clean line-item rows with name, duration, integer paise pricing, and minimalist "Add" buttons.
- **Bottom Navigation:** Understated icons with dark ink active indicator and micro-tracked labels.

---

## 3. Partner App Palette & Design Language (`app/(partner)/`)

### 3.1 Aesthetic Persona
- **Vibe:** Modern productivity dashboard, clarity, operational control, eco-business trust (Stripe, Shopify, Toast).
- **Visuals:** Crisp white cards with soft elevation (`elevation: 2`), rounded icon squircles (`borderRadius: 10-12`), mint pastel callouts, interactive schedule pills, and rich emerald green CTAs.

### 3.2 Color Tokens Matrix

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| **`Partner Background`** | `#F8FAFC` / `#F5F7F6` | Light slate-tinted canvas for dashboard card contrast |
| **`Partner Card Surface`** | `#FFFFFF` | Pure white container cards with 16-20px rounded corners |
| **`Partner Card Border`** | `#E2E8F0` / `#E5E7EB` | Crisp subtle boundary lines separating actionable dashboard cards |
| **`Partner Primary Brand`** | `#0D7A53` / `#065F46` | Rich Forest Emerald for primary CTA buttons, active switches, and brand emblem |
| **`Partner Mint Surface`** | `#EBF5F0` / `#F0FDF4` | Soft mint pastel for icon squircles, banner cards, and section badges |
| **`Partner Mint Border`** | `#D1FAE5` / `#DCFCE7` | Subtle border for the Opening Hours hero banner |
| **`Partner Text Primary`** | `#111827` / `#0F172A` | Deep charcoal ink for card titles, section headers, and form inputs |
| **`Partner Text Muted`** | `#64748B` / `#94A3B8` | Slate gray for subtitles, field placeholders, and helper text |
| **`Partner Pending Alert`** | `#F59E0B` (Amber) | Attention badge for pending incoming booking requests |
| **`Partner Danger / Exit`** | `#EF4444` (Coral Red) | Red icon & text for `Sign Out` and critical rejection actions |
| **`Partner Danger Surface`**| `#FEF2F2` / `#FFF5F5` | Soft light red background for the Sign Out card |

### 3.3 Partner Component Guidelines
- **Brand Header:** Circular emerald emblem with white **"G"** mark, accompanied by bold `GLIDE PARTNER` and `Partner Dashboard` subtitle.
- **Status Toggle Card:** White card with `● OPEN` (green) / `● PAUSED` (gray/amber) state text and an emerald toggle switch.
- **Action Cards:** Rounded squircle badges with mint background (`#EBF5F0`) and emerald icons (`calendar-outline`, `qr-code-outline`, `pricetag-outline`, `person-outline`).
- **Opening Hours Card:**
  - Pastel mint hero banner (`#EBF5F0`) with clock badge and custom vector storefront illustration.
  - 7 day rows with start/end time pill chips (`[ 🕒 09:00 ∨ ] to [ 🕒 20:00 ∨ ]`) and individual toggle switches.
- **Primary Buttons:** Emerald green (`#0D7A53`) with white text and matching icons (`Save Profile`, `Save Hours`).
- **Sign Out Card:** Soft red background (`#FFF5F5`) with red border (`#FEE2E2`) and red logout icon (`#EF4444`).

---

## 4. Side-by-Side Comparison Matrix

| Visual Element | Customer App (`app/(customer)/`) | Partner App (`app/(partner)/`) |
| :--- | :--- | :--- |
| **Primary Brand Mood** | Luxury Salon Discovery, Warm Cream & Ink | Merchant Operations, Mint & Emerald |
| **Screen Background** | Warm Cream `#F6F1E8` or White `#FFFFFF` | Light Slate `#F8FAFC` |
| **Primary CTA Button** | Ink Black `#000000` or Deep Plum `#512A45` | Forest Emerald Green `#0D7A53` |
| **Active Switch / Toggle** | Ink Noir or Plum `#512A45` | Forest Emerald Green `#0D7A53` |
| **Icon Badges / Squircles** | Minimalist wireframe or Plum tint `#F3EBF0` | Mint Squircle `#EBF5F0` with `#0D7A53` icon |
| **Card Style** | Unboxed hairline lists or portrait lookbook cards | White elevated cards with `borderRadius: 16-20` |
| **Section Dividers** | 1px hairline dividers (`StyleSheet.hairlineWidth`) | Card containers with `#E2E8F0` border |
| **Status Badge** | Gold Star `#E7C45A`, Green Open `#23845B` | Status Dot `● OPEN` / `● PAUSED` |
| **Sign Out Button** | Minimalist text link | Soft red card (`#FFF5F5`) with red icon |

---

## 5. Rules for AI Assistants & Developers

1. **Never Mix Role Palettes:**
   - Do NOT use Partner Emerald Green (`#0D7A53`) as the primary brand theme inside `app/(customer)/`.
   - Do NOT use Customer Plum Noir (`#512A45`) as the primary CTA or header theme inside `app/(partner)/`.

2. **Maintain Strict Color Semantics:**
   - Red (`#EF4444`) is strictly for Destructive actions, Sign Out, or Errors.
   - Green (`#0D7A53` / `#10B981`) is for Primary Partner CTAs, Success feedback, and `● OPEN` status.
   - Amber (`#F59E0B`) is for Pending incoming requests and rating stars.

3. **Always Support Responsiveness:**
   - Customer screens prioritize vertical mobile flow and swipeable lookbook carousels.
   - Partner screens adapt dynamically: single-column vertical card stream on mobile, side-by-side dashboard grid (`leftColumn` 42%, `rightColumn` 58%) on tablet/desktop.

4. **Preserve Contrast & Accessibility:**
   - Text on Emerald buttons (`#0D7A53`) must always be pure White (`#FFFFFF`).
   - Dark text on Mint backgrounds (`#EBF5F0`) must be deep slate (`#111827`).
   - Placeholder text in inputs must remain accessible (`#94A3B8`).

---
