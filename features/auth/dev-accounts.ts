// Dev-only convenience — see app/(auth)/phone.tsx's `isDevLoginEnabled`,
// which renders these buttons when EITHER `__DEV__` is true (Expo Go / a
// dev-client on Metro) OR `EXPO_PUBLIC_ENABLE_DEV_LOGIN` is "true" (set in
// eas.json's `development` and `preview` build profiles only — deliberately
// absent from `production`, so this cannot ship to the Play Store no matter
// what).
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
