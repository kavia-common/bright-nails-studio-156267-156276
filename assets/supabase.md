# Supabase Configuration for Bright Nails Studio (Frontend)

Status: PARTIAL (awaiting environment variables)

We attempted to connect to Supabase to validate and provision the database via tooling:

- SupabaseTool_list_tables: FAILED (Invalid URL). This indicates Supabase environment variables are not set for this environment.
- As soon as the environment variables are present, we will:
  1) List existing tables
  2) Create missing tables (bookings)
  3) Apply RLS policies and helper RPCs
  4) Re-document as COMPLETE

Follow the steps below to complete configuration.

---

1) Required Environment Variables (CRA)
Create a .env file in nail_art_frontend/ with the following keys:

- REACT_APP_SUPABASE_URL=<your-supabase-project-url>
- REACT_APP_SUPABASE_ANON_KEY=<your-anon-key>
- REACT_APP_SITE_URL=<your-site-url>  (e.g., http://localhost:3000 for local dev)

Notes:
- For create-react-app, all runtime env vars must start with REACT_APP_.
- After creating/updating .env, restart the dev server to pick up changes.

---

2) Supabase Auth configuration (Dashboard)
- Go to Authentication > URL Configuration
  - Site URL: set to your production domain or http://localhost:3000 during development
  - Additional Redirect URLs:
    * http://localhost:3000/**
    * https://your-production-domain.com/**
- (Optional) Update Email Templates to use SiteURL and RedirectTo variables.

---

3) Planned Database Schema (idempotent)
We recommend creating a bookings table to record appointment requests. The UI can read time slot availability via a safe RPC that only exposes day and slot (no PII).

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

4) SQL to provision schema and policies
Use Supabase SQL Editor or the SupabaseTool_run_sql step after env vars are set.

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

5) Frontend integration overview (React / CRA)
- Use environment variables for Supabase URL/Key (never hardcode)
- Use a dynamic getURL() helper for auth redirects
- Use emailRedirectTo/redirectTo with getURL() in auth flows
- Provide an AuthCallback component for handling Supabase auth redirects

Files prepared in src/ (scaffold; not imported to avoid build errors until deps are installed):
- utils/getURL.js: returns an environment-aware site URL
- utils/auth.js: shared auth error handler
- utils/supabaseClient.js: Supabase client (requires @supabase/supabase-js)
- utils/authClient.js: signUp/reset/magic link/OAuth helpers (use getURL redirects)
- components/AuthCallback.jsx: callback handler (loads client at runtime)

IMPORTANT: @supabase/supabase-js must be installed after env vars are provided:
npm i @supabase/supabase-js

---

6) Next steps (what we will do next after env provided)
- Re-run SupabaseTool_list_tables to validate the schema
- Apply the SQL above with SupabaseTool_run_sql (idempotent)
- Wire BookingForm to fetch availability using RPC get_booked_slots, while keeping localStorage fallback
- Add optional sign-up/login flows if needed

---

7) Troubleshooting
- If "Invalid URL" or failed connection appears in tools, confirm:
  - REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set
  - Project URL copied from Supabase API settings (not storage or other)
- If auth redirect fails, verify Authentication > URL Configuration in Supabase dashboard.
