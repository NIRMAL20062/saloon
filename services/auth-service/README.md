# Auth Service

GLIDE target architecture, Phase 1 (`docs/TARGET_ARCHITECTURE_ROADMAP.md`). OTP login, session issuance, refresh — the first real service of the new backend, standing alongside (not replacing) the currently-deployed Expo/Supabase app.

## What's real vs. what still needs verifying

Written and reviewed honestly, not oversold:

- **Actually run and passing in this environment:** all unit tests (`otpService`, `tokenService`, rate limiter) and the `profileRepository` tests, which run the *real* migration SQL and the *real* parameterized queries against `pg-mem` (an in-memory Postgres emulator) — see `tests/profileRepository.test.ts` for exactly why that approach was used instead of a real Postgres.
- **Not verified here, needs checking on real infra before staging:**
  - The migration (`src/db/migrations/0001_init.sql`) has never run against a real Postgres server — this sandbox had no working Docker (`permission denied` on the Docker socket) and no local Postgres install. `docker-compose.yml` is provided for this; run it and confirm the migration applies cleanly before trusting this beyond local dev.
  - `otpRepository`/`refreshTokenRepository` are exercised through `pg-mem` only via the routes they're used in, not independently unit-tested the way `profileRepository` is — worth adding direct tests for those two the same way if this is picked up further.
  - No real SMS provider is wired in (`src/lib/smsProvider.ts` only has a `console.log` dev stub) — pick a real vendor (Twilio, MSG91, etc.) before this reaches anyone but a developer's own phone number in logs.
  - Load/concurrency testing (many simultaneous OTP sends/verifies for the same number) hasn't been done.

## Running it locally

```bash
npm install
cp .env.example .env   # fill in a real DATABASE_URL once Postgres is running (see docker-compose.yml)
npm run dev
```

## Running the tests

```bash
npm test
```

No database needed to run the test suite — see the note above on `pg-mem`.

## Design notes worth knowing before extending this

- **No RLS here.** This is a self-managed Postgres instance, not Supabase's PostgREST/RLS layer — every repository function is the *only* place a query for that table happens, and each one is written assuming it is the last line of defense for who can read/write what. See `docs/TARGET_ARCHITECTURE.md` Section 8.
- **The "API Gateway" role is folded into this service for now** (`src/middleware/requireAuth.ts`) rather than a separate deployable — there's only one backend service to route to today, so a dedicated Gateway process adds nothing yet. Split it out once Phase 2's Discovery Service exists and there's more than one place to route between.
- **Rate limiting is in-memory, single-process** (`src/middleware/rateLimit.ts`) — it will under-count the moment this service runs as more than one replica. Move it to Redis before scaling replicas past one; the file has a comment flagging exactly this.
- **Refresh tokens rotate on every use** and are stored only as a hash — a replayed (stolen) refresh token is caught because the legitimate use already revoked it.
