# Supabase Configuration for Bright Nails Studio (Frontend)

Status: PARTIAL (awaiting environment variables)

This document captures the Supabase backend configuration for bookings and authentication, the required environment variables, and the exact SQL to provision tables and policies. It also includes the required steps to verify and apply schema using Supabase tools.

Latest attempt (this run):
- SupabaseTool_list_tables: FAILED (Invalid URL). The Supabase client could not be created because environment variables are not configured in this environment.
- Root cause: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are not present (container_env is empty/None). Without these, tools cannot connect to your Supabase project.
- Next action: Provide environment variables, then re-run the tools in the order below.

---

1) Required Environment Variables (Create React App)
Create nail_art_frontend/.env with:

- REACT_APP_SUPABASE_URL=<your-supabase-project-url>
- REACT_APP_SUPABASE_ANON_KEY=<your-anon-key>
- REACT_APP_SITE_URL=<your-site-url>  (e.g., http://localhost:3000 for local dev)
- (Optional) REACT_APP_INSTAGRAM_USERNAME=<your_instagram_handle>

Notes:
- For create-react-app, all runtime env vars must start with REACT_APP_.
- After creating/updating .env, restart the dev server to pick up changes.

---

2) Supabase Auth configuration (Dashboard)
- Authentication > URL Configuration
  - Site URL: your production domain or http://localhost:3000 during development
  - Additional Redirect URLs:
    * http://localhost:3000/**
    * https://your-production-domain.com/**
- (Optional) Update Email Templates and use SiteURL/RedirectTo variables.

---

3) Planned Database Schema (idempotent)
We create a bookings table to record appointment requests. The UI reads time slot availability via a SECURITY DEFINER RPC that only exposes day and slot (no PII).

Tables
- public.bookings
  - id uuid primary key default gen_random_uuid()
  - created_at timestamptz not null default now()
  - name text
  - email text
  - service text not null
  - day date not null
  - slot text not null
  - notes text
  - status text not null default 'pending'
  - user_id uuid references auth.users(id)

Indexes / constraints
- Unique day/slot to prevent double-booking

RLS
- Enable RLS
- Allow INSERTs from anon (for public booking submissions) — can be tightened later
- Allow SELECT by authenticated users for their own records
- Provide a SECURITY DEFINER RPC to expose day/slot ranges for the frontend (anon allowed)

---

4) SQL to provision schema and policies (idempotent)
Use Supabase SQL Editor or SupabaseTool_run_sql after env vars are set.

-- extensions (if needed)
create extension if not exists pgcrypto;

-- table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text,
  service text not null,
  day date not null,
  slot text not null,
  notes text,
  status text not null default 'pending',
  user_id uuid references auth.users(id)
);

-- prevent double bookings
create unique index if not exists idx_unique_day_slot on public.bookings(day, slot);

-- enable RLS
alter table public.bookings enable row level security;

-- allow inserts from anon (for public booking submissions)
create policy if not exists "Allow inserts for anon" on public.bookings
for insert
to anon
with check (true);

-- allow authenticated users to read their own rows
create policy if not exists "Allow users to read own bookings" on public.bookings
for select
to authenticated
using (auth.uid() = user_id);

-- RPC to expose only day/slot to public (anon)
create or replace function public.get_booked_slots(d_from date, d_to date)
returns table(day date, slot text)
language sql
security definer
set search_path = public
as $$
  select day, slot
  from public.bookings
  where day between d_from and d_to
$$;

grant execute on function public.get_booked_slots(date, date) to anon, authenticated;

---

5) Required Tool Usage (sequence to run after env vars are set)
Run these in order:

1. SupabaseTool_list_tables
   - Purpose: Validate connectivity and see if 'bookings' already exists.
2. SupabaseTool_create_table
   - table_name: "bookings"
   - columns:
     - { name: "id", type: "uuid", default: "gen_random_uuid()" }
     - { name: "created_at", type: "timestamptz", default: "now()" }
     - { name: "name", type: "text" }
     - { name: "email", type: "text" }
     - { name: "service", type: "text" }
     - { name: "day", type: "date" }
     - { name: "slot", type: "text" }
     - { name: "notes", type: "text" }
     - { name: "status", type: "text", default: "'pending'" }
     - { name: "user_id", type: "uuid" }
   - Note: FK to auth.users for user_id can be added via SQL (see above).
3. SupabaseTool_run_sql
   - Apply: extension, unique index, RLS policies, RPC (the SQL in section 4).
4. Document results
   - Update this file with “Status: COMPLETE”, list created objects, and any policy notes.

If any step fails:
- Re-check env values and that the URL/Key are copied from Supabase Project Settings > API.
- Ensure the URL in SupabaseTools configuration matches your project URL (not storage URL).

---

6) Frontend integration overview (React / CRA)
- Never hardcode URLs; use environment variables for Supabase URL/Key.
- Use a dynamic getURL() helper for auth redirects.
- Use emailRedirectTo/redirectTo with getURL() in auth flows.
- Provide an AuthCallback component for handling Supabase auth redirects.

Files prepared in src/:
- utils/getURL.js: returns an environment-aware site URL (used for auth redirects).
- utils/auth.js: shared auth error handler.
- utils/supabaseClient.js: Supabase client (requires @supabase/supabase-js).
- utils/authClient.js: signUp/reset/magic link/OAuth helpers (use getURL redirects).
- components/AuthCallback.jsx: callback handler (loads client dynamically on demand).

Install the client library after env vars are provided:
npm i @supabase/supabase-js

---

7) End-to-end validation checklist (after env + SQL applied)
Backend:
- Re-run SupabaseTool_list_tables to confirm 'bookings' exists.
- SupabaseTool_run_sql with "select count(*) from public.bookings;" to verify access.
- SupabaseTool_run_sql: "select * from public.get_booked_slots(current_date, current_date + 7);" should return rows or empty set.

Frontend:
- npm i @supabase/supabase-js
- Start dev: npm start
- Navigate to /auth/callback after a sign-in or magic link flow; ensure AuthCallback processes sessions.
- Update BookingForm later to fetch availability using public.get_booked_slots (keep localStorage as a fallback until confirmed).

---

8) Troubleshooting
- "Invalid URL" or failed connection in tools:
  - Ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in .env.
  - Confirm the URL is from Project Settings > API (the top "Project URL").
- Auth redirect failures:
  - Verify Authentication > URL Configuration in Supabase dashboard.
  - Make sure all auth helpers use getURL() for dynamic redirects.

---
History:
- Attempt 1: Tools failed (Invalid URL) – env vars not present.
- Attempt 2 (this run): Same failure; documented steps, provided .env.example, ready to re-run once envs are set.
