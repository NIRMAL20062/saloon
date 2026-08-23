// Dev-only convenience — never wired up outside a __DEV__ build (see
// app/(auth)/phone.tsx, which only renders the buttons using these when
// `__DEV__` is true). __DEV__ is false in any EAS/production build, so this
// cannot ship to the Play Store no matter what.
//
// These are throwaway Supabase Auth accounts with no real customer data
// behind them — they exist so testing sign-in doesn't require a real phone
// number and a real (paid) Twilio SMS send on every single run. Create them
// once via Supabase Dashboard > Authentication > Users > Add user (tick
// "Auto Confirm User"), then give each one a matching `profiles` row:
//
//   insert into public.profiles (id, phone, full_name, role)
//   values ('<uuid from the Users page>', null, 'Dev Customer', 'customer');
//
// Change these passwords to whatever you used when creating the accounts —
// they only unlock an empty test account, never anything real, so there's no
// harm in them living in source.
export const DEV_ACCOUNTS = [
  { label: 'Dev: Customer', email: 'dev-customer@glide.test', password: 'dev-testing-only' },
  { label: 'Dev: Partner', email: 'dev-partner@glide.test', password: 'dev-testing-only' },
] as const;
