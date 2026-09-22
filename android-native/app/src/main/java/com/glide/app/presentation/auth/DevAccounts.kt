package com.glide.app.presentation.auth

/**
 * Dev-only convenience — mirrors features/auth/dev-accounts.ts exactly (same
 * accounts, same backend). These are throwaway Supabase Auth accounts with no
 * real customer data behind them, so sign-in testing doesn't burn a real
 * (paid) Twilio SMS send on every run.
 *
 * Rendered only when BuildConfig.DEBUG is true (see PhoneEntryScreen) — never
 * reachable in a release build, by construction, not by discipline.
 *
 * dev-admin@glide.test does not exist yet: Supabase's signup validation
 * rejects the reserved ".test" TLD for *new* accounts (the existing
 * customer/partner ones were created earlier via the Dashboard's "Add user",
 * which doesn't apply that check). Create it the same way as the original two
 * — Dashboard > Authentication > Users > Add user (tick "Auto Confirm User"),
 * then: insert into public.profiles (id, full_name, role) values
 * ('<uuid>', 'Dev Admin', 'admin');
 */
data class DevAccount(val label: String, val email: String, val password: String)

val DEV_ACCOUNTS = listOf(
    DevAccount("Dev: Customer", "dev-customer@glide.test", "dev-testing-only"),
    DevAccount("Dev: Partner", "dev-partner@glide.test", "dev-testing-only"),
    DevAccount("Dev: Admin", "dev-admin@glide.test", "dev-testing-only"),
)
