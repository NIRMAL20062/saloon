import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase/client';

export type Role = 'customer' | 'partner' | 'admin';

export type Profile = {
  id: string;
  phone: string | null;
  full_name: string | null;
  photo_url: string | null;
  role: Role;
  created_at: string;
};

type AuthState = {
  session: Session | null;
  /**
   * `undefined` = haven't checked the `profiles` table for this session yet.
   * `null` = checked, and no row exists (first-ever login — onboarding needs to create one).
   * `Profile` = loaded successfully.
   */
  profile: Profile | null | undefined;
  /** True only until the very first session check (and profile fetch, if any) resolves. */
  initializing: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, phone, full_name, photo_url, role, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        // A signed-in user with an unreadable profile row shouldn't get stuck
        // on a blank screen forever — fall back to "no profile yet" so they
        // land on onboarding, where a real insert error (if any) surfaces.
        console.warn('[auth] failed to load profile:', error.message);
        setProfile(null);
      } else {
        setProfile(data ?? null);
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session) await fetchProfile(data.session.user.id);
      if (isMounted) setInitializing(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        setProfile(undefined);
        fetchProfile(nextSession.user.id);
      } else {
        setProfile(undefined);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      initializing,
      refreshProfile: async () => {
        if (!session) return;
        const { data, error } = await supabase
          .from('profiles')
          .select('id, phone, full_name, photo_url, role, created_at')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!error) setProfile(data ?? null);
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
