# Hotel-org — Orderly Hub Platform Control Plane

Platform SaaS dashboard for Orderly Hub administrators. Monitors and manages every customer organization that uses the restaurant app.

## Repositories

| Role | Path | GitHub |
|------|------|--------|
| Platform dashboard (this repo) | `.` | https://github.com/swift08/Hotel-org.git |
| Customer / restaurant app | `orderly-hub/` (submodule) | https://github.com/swift08/orderly-hub.git |

Both apps share the same Supabase project. Organizations map to `public.businesses`.

## Clone

```bash
git clone --recurse-submodules https://github.com/swift08/Hotel-org.git
cd Hotel-org
npm install
```

## Database setup

1. Ensure the orderly-hub base schema is applied (`orderly-hub/setup_database.sql`).
2. Apply the platform additive migration in the Supabase SQL editor:

   - [`supabase/platform_schema.sql`](supabase/platform_schema.sql)

   This creates plans, subscriptions, platform RBAC, audit logs, support sessions, errors, and usage views.

3. Seed the first platform owner (replace the UUID with your auth user id):

```sql
INSERT INTO public.platform_admins (user_id, role, is_active, display_name, level)
VALUES ('YOUR-AUTH-USER-UUID', 'platform_owner', true, 'Platform Owner', 'owner')
ON CONFLICT (user_id) DO UPDATE
SET role = 'platform_owner', is_active = true;
```

Restaurant Owners are **not** platform admins. Platform access requires a `platform_admins` row.

## Environment

Copy `.env.example` → `.env` and set the same Supabase values used by orderly-hub:

```
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` via `VITE_*`.

## Hosted deploy (Lovable / Vercel)

Set these **server** env vars in the host project settings (Production + Preview), then redeploy:

| Variable | Required |
|----------|----------|
| `SUPABASE_URL` | yes (or rely on `VITE_SUPABASE_URL`) |
| `SUPABASE_PUBLISHABLE_KEY` | yes (or rely on `VITE_SUPABASE_PUBLISHABLE_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | recommended (full admin APIs; dashboard can fall back to user RLS) |
| `VITE_SUPABASE_URL` | yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes |

After changing env vars, **redeploy**. Also run the latest [`supabase/platform_schema.sql`](supabase/platform_schema.sql) in the Supabase SQL editor so platform-admin RLS policies exist (required for hosted data loading without service role).

Use the **same** Supabase project as orderly-hub. After first deploy, seed a platform owner in the SQL editor:

```sql
INSERT INTO public.platform_admins (user_id, role, is_active, display_name, level)
SELECT id, 'platform_owner', true, 'Platform Owner', 'owner'
FROM auth.users
WHERE email = 'admin@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'platform_owner', is_active = true;
```

If login still says “no platform administrator access”, the `platform_admins` row is missing for that Auth user.

## Develop

```bash
npm run dev
```

Sign in at `/auth/login` with a platform admin account. Main console: `/dashboard`.

## Architecture

```text
Hotel-org (platform UI + serverFns)
        │
        ▼
 Shared Supabase (Auth + Postgres + RLS)
        ▲
        │
orderly-hub (restaurant app)
```

Privileged cross-tenant operations run only in Hotel-org server functions using the service role after `assertPlatformPerm(...)`.
