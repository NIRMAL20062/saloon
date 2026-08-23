import { supabase } from '@/lib/supabase/client';

/**
 * Loose E.164 shape check so we don't burn an OTP send on an obviously
 * malformed number. This is a UX nicety only — Supabase Auth is what actually
 * validates and rate-limits the number server-side; never rely on this
 * client-side check for anything security-relevant.
 */
export function isLikelyValidPhone(phone: string) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export async function sendOtp(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
  return data;
}
