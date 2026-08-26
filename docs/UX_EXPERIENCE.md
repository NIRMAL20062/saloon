# GLIDE — App Experience Reference

**How each UX/experience detail actually works** — the mechanism behind it, which files it touches, and what state it depends on. This is a companion to [`DESIGN.md`](DESIGN.md) (system architecture/screens) and [`CLAUDE.md`](../CLAUDE.md) (build order/rules). DESIGN.md says what each screen is; this document says how a specific interaction on that screen behaves.

Same phase discipline as everywhere else in this repo: the **"Now"** section is scoped to what's already built or in progress (Phases 1–3) and can be picked up as real tasks. The **"Backlog"** section describes experience details for features that don't exist yet (Phases 4+) — written down so the idea isn't lost, not to be built before its phase arrives.

---

## Now — Phase 1–3 experience details

### Auto-advance phone → OTP
**How it works:** `(auth)/phone.tsx` validates the number locally (length/format only — never treated as verified until Supabase confirms), calls the existing OTP-request function from `features/auth/otp.ts`, and on a successful response navigates to `(auth)/verify.tsx` itself — no separate "Next" button the user has to notice and tap. A failed request (bad number, rate-limited) keeps the user on the phone screen and shows the error inline instead of navigating.

### Auto-submit OTP at 6 digits
**How it works:** `(auth)/verify.tsx` holds the code in a controlled input; a `useEffect` watching that value fires the verify call automatically once `code.length === 6`, instead of waiting for a submit tap. The input is disabled while the request is in flight so a fast typist can't double-submit. On failure (wrong/expired code), the field clears and re-enables rather than silently retrying.

### Resend-OTP cooldown timer
**How it works:** after a successful OTP request, store a client-side `resendAvailableAt` timestamp (e.g. `Date.now() + 30_000`) in local component state. The resend button renders disabled with a live countdown (`Resend in 0:23`) until that timestamp passes, then re-enables. This is purely a UX nicety — it does not replace Supabase's server-side OTP rate limiting (CLAUDE.md §5.1/5.6), it just keeps the user from hammering a button that the server would reject anyway.

### Role-picker as two tappable cards
**How it works:** shown once, only when a session exists but no `profiles` row does yet. Two large `Pressable` cards ("I'm a customer" / "I'm a shop shop owner") each carry the role string; tapping one calls the existing profile-creation logic with that role, then routes to `(customer)` or `(partner)`. No toggle/switch component — a full-width card is harder to mis-tap than a small switch, which matters for a first-time, possibly non-technical user.

### Shop list skeleton loaders
**How it works:** while `features/shops/api.ts`'s list query is in flight, `(customer)/index.tsx` renders a fixed number (e.g. 4–5) of placeholder rows shaped like a real shop card — grey blocks for the image, name, and rating — using the existing `themed-view` token colors so it respects light/dark mode automatically. Swapped for real rows the instant the query resolves. No new dependency needed — it's static styled `View`s, not a shimmer library, to keep the bundle light per the 8 GB dev-machine constraint.

### Shop list empty state
**How it works:** after the query resolves, if the result array is length 0, render a dedicated empty view (icon + "No shops nearby yet" + maybe a retry/refresh action) instead of an empty `FlatList`. This is a conditional render branch in `(customer)/index.tsx`, not a separate screen.

### Pull-to-refresh with haptics
**How it works:** the shop list's `FlatList`/`ScrollView` gets a `RefreshControl` wired to re-run the `features/shops/api.ts` query; on the refresh trigger, call the same haptic feedback function already used by `components/haptic-tab.tsx` (Expo's `Haptics.impactAsync`) so the gesture has tactile confirmation, matching the pattern already established for tab presses.

### Shop profile sticky/parallax header
**How it works:** `(customer)/shop/[id]` already has `components/parallax-scroll-view.tsx` available — it's built exactly for a hero image that shrinks/fades as the user scrolls, with the header content (shop name, rating) staying pinned once the hero collapses. Wiring the shop profile screen to use this component (rather than a plain `ScrollView`) is the whole change — no new component needed, just adoption.

### Inline validation on service price/duration
**How it works:** in the services form (`(partner)/services.tsx`), validate on every `onChangeText`, not just on submit — check `price > 0` and within a sane max, `duration_min > 0` and within a sane max, using the same bounds the Postgres-level check constraint enforces (CLAUDE.md Phase 3). On failure, the `themed-text-input` border switches to an error color (add an `error` token to `constants/theme.ts` if one doesn't exist yet) and a small message renders under the field. The submit button stays enabled but the server-side constraint remains the actual backstop — this is a UX improvement, not a replacement for it.

### "Saved ✓" confirmation flash
**How it works:** after a successful `features/shops/partner-api.ts` mutation, set a local `justSaved` boolean true, render a small checkmark/toast near the save button, and clear the flag after ~2 seconds via `setTimeout`. Keeps the partner (a non-technical persona, per CLAUDE.md §1.1) from wondering whether a tap actually registered.

### Services list: toggle instead of delete-only
**How it works:** each service row gets a switch bound to `services.is_active` (already in the Phase 1 schema) instead of the only action being permanent delete. Toggling calls a `partner-api.ts` update on `is_active`, scoped by the existing RLS rule (`shops.owner_id = auth.uid()`), same as any other partner write in Phase 3 — no new server logic required, since the column and policy already exist.

### `is_open` one-tap toggle
**How it works:** this is the one still-open Phase 3 item from CLAUDE.md §13. Add a large, colored (green = open / red = closed) toggle at the top of the partner's shop profile screen — not buried in a settings form — bound directly to `shops.is_open`. Tapping calls a `partner-api.ts` update scoped by `owner_id = auth.uid()`, same RLS path as the rest of Phase 3's writes. The visual weight (full-width, color-coded, top of screen) is deliberate: CLAUDE.md frames this as an "emergency pause" a shop owner needs to hit fast during a power cut or walkout, not a setting they dig for.

### Consistent haptics on primary actions
**How it works:** wherever a screen has a primary commit action (submit OTP, save shop profile, accept/reject once Phase 4 lands), call the same `Haptics.impactAsync(ImpactFeedbackStyle.Light)` helper already used in `components/haptic-tab.tsx`. Worth factoring that call into a tiny shared helper (e.g. `lib/haptics.ts`) once it's used in more than one or two places, so every screen calls the same wrapper instead of importing `expo-haptics` ad hoc.

### Dark mode pass
**How it works:** no new code — this is a verification task. Toggle the device's system theme, walk every existing screen, and confirm each one reads its colors from `Colors.light`/`Colors.dark` in `constants/theme.ts` via `themed-view`/`themed-text`/`themed-text-input`, rather than a hardcoded hex value slipped in somewhere. Any screen that fails this check gets its raw color swapped for the matching theme token.

---

## Backlog — experience details for later phases (not to build yet)

### Live countdown rings (slot hold, shop response window) — Phase 4
**How it would work:** rather than plain text ("expires in 8:42"), render a circular progress ring (e.g. an SVG `Circle` with an animated `strokeDashoffset`) that visually depletes as `slot_hold_expires_at`/`shop_response_expires_at` approaches. The countdown value itself must still be computed from server-provided timestamps, never the device clock alone (CLAUDE.md §11: clock skew is an explicit test case) — the ring is a rendering of server truth, not a client-side timer that invents its own deadline.

### "Why is this pending" payment state — Phase 5
**How it would work:** between the Razorpay Checkout success screen closing and the `razorpay-webhook` actually flipping `bookings.status = confirmed`, show an explicit "Confirming your payment…" state with a short explanation line, driven by a Realtime subscription on the booking row (Phase 8 infrastructure) or a short poll if Realtime isn't wired yet at that point. The point is the user is never staring at a bare spinner with no context while the true source of truth (the webhook) catches up.

### QR with "tap to reveal digits" fallback — Phase 6
**How it would work:** the arrival-verification screen renders the QR code as the default, with a text link/button beneath it ("Can't scan? Show code") that reveals the same cached 6-digit code as large text. Both come from the same locally cached value fetched once with margin (CLAUDE.md's basement/dead-zone design note) — the fallback is a display toggle, not a second network fetch.

### Instant-booking radar/pulse animation — Phase 9
**How it would work:** while `bookings.status = broadcasting`, animate a looping pulse (concentric circles expanding/fading, `Animated.loop` on scale + opacity) around a center point representing the customer, to visually communicate "actively searching nearby shops" instead of a static spinner. Purely cosmetic — has no bearing on the actual broadcast logic, which stays entirely server-side per DESIGN.md §4.8.

### Grouped notification center — Phase 8
**How it would work:** instead of one flat chronological list from the `notifications` table, group rows by `data.booking_id` in the client query/render step, so all updates for one booking ("shop accepted" → "payment confirmed" → "verified") appear as one thread rather than three separate flat entries. No schema change needed — `notifications.data` already carries the booking id (CLAUDE.md §10); this is a client-side grouping transform only.

---

## Notes for whoever picks these up

- Nothing in the "Now" section requires a new table or Edge Function — they're all client-side/UI changes layered on schema and RLS that already exist from Phases 1–3.
- Per CLAUDE.md rule 9, none of the "Backlog" items should be started before their phase arrives, even though the mechanism is written down here.
- Any item that touches a `themed-*` component should extend that component's shared styles rather than one-off inline styles, to keep light/dark theming centralized in `constants/theme.ts`.
