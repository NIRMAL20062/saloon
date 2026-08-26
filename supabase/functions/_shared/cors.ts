// Standard permissive CORS for Edge Functions called from the Expo app.
// Every function must handle the OPTIONS preflight the same way, or the
// browser-based `expo start --web` dev flow can't call them at all.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
