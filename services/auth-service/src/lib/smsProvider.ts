/**
 * SMS provider interface — swap `ConsoleSmsProvider` for a real one (Twilio,
 * MSG91, etc.) once a provider/account is chosen. Deliberately not wired to
 * a real vendor here: this sandbox has no SMS provider credentials, and
 * guessing a vendor wasn't part of what was asked for. Whoever owns this
 * service picks the real implementation before this ever reaches staging.
 */
export type SmsProvider = {
  sendOtp(phone: string, code: string): Promise<void>;
};

/** Dev-only stand-in — logs instead of sending. Never use this in staging/production. */
export const consoleSmsProvider: SmsProvider = {
  async sendOtp(phone: string, code: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[dev-sms-provider] OTP for ${phone}: ${code} (this is not a real SMS — dev only)`);
  },
};
