# Vercel Environment Variables Inventory — Rasoi SaaS

This document details all required public and server-side secret environment variables for deploying Rasoi SaaS on Vercel.

---

## Environment Variable Matrix

| Variable Name                   | Type                     | Scope            | Required | Vercel Environment         | Description                                                                                                           |
| :------------------------------ | :----------------------- | :--------------- | :------- | :------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Public                   | Client & Server  | **Yes**  | Dev / Preview / Production | Public Supabase HTTPS endpoint URL.                                                                                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public                   | Client & Server  | **Yes**  | Dev / Preview / Production | Public Supabase anon publishable key for client requests.                                                             |
| `VITE_SUPABASE_PROJECT_ID`      | Public                   | Client & Server  | **Yes**  | Dev / Preview / Production | Supabase project ID identifier.                                                                                       |
| `SUPABASE_URL`                  | Server Only              | Server Functions | **Yes**  | Dev / Preview / Production | Supabase HTTPS endpoint URL for server context.                                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Secret (Server Only)** | Server Functions | **Yes**  | Dev / Preview / Production | Supabase admin service role key for server operations (bypass RLS for server validation). **NEVER expose to client.** |
| `SUPABASE_PROJECT_ID`           | Server Only              | Server Functions | **Yes**  | Dev / Preview / Production | Server-side Supabase project ID identifier.                                                                           |

---

## Security Guidelines

1. **Client Isolation**: Variables prefixed with `VITE_` are bundled into the browser bundle by Vite. Only place public endpoints and publishable keys in `VITE_` variables.
2. **Server Secrets**: `SUPABASE_SERVICE_ROLE_KEY` and any private API credentials must NEVER use the `VITE_` prefix and MUST only be accessed inside `*.server.ts` or `createServerFn` handlers.
3. **Secret Scanner Verification**: The automated `npm run security:audit` suite scans built client artifacts to enforce 0 secret leaks prior to deployment.
