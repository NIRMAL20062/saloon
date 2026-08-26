import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

/**
 * Resolves the *real* caller from the request's JWT — never from a
 * client-supplied `customer_id`/`actor_id` field in the request body
 * (CLAUDE.md Section 5.4: "every ID passed from the client... [is] never
 * trusted as 'this belongs to this user because the app said so'"). A bad or
 * missing token returns `null`; the caller decides how to respond.
 */
export async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

/** The service-role client — the only one allowed to call the `security definer` booking functions. */
export function serviceRoleClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, serviceRoleKey);
}
