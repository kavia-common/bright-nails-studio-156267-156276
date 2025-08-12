# Supabase Configuration for Bright Nails Studio (Frontend)

Status: PARTIAL (awaiting environment variables; tooling could not connect)

This document captures the Supabase backend configuration for the bookings system, including the schema, row-level security (RLS) policies, and how to complete setup. It also records tool run status for traceability.

Latest attempt (this run):
- SupabaseTool_list_tables: FAILED with PGRST202 (public.run_sql not found). Likely due to missing project configuration/URL in this environment.
- SupabaseTool_create_table: FAILED with PGRST202 (public.run_sql not found).
- SupabaseTool_run_sql: FAILED with PGRST202 (public.run_sql not found).
- Root cause: Environment variables are not present (container_env = None). Without REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY, the SupabaseTools cannot connect to your project.

Next action: Provide environment variables, then re-run the tools in order (see “How to apply using tools” below). You can also run the SQL in the Supabase Dashboard SQL Editor.

---

1) Required Environment Variables (Create React App)
Create nail_art_frontend/.env with:

- REACT_APP_SUPABASE_URL=<your-supabase-project-url>
- REACT_APP_SUPABASE_ANON_KEY=<your-anon-key>
- REACT_APP_SITE_URL=<your-site-url>  (e.g., http://localhost:3000 for local dev)

Notes:
- For create-react-app, runtime env vars must start with REACT_APP_.
- After creating/updating .env, restart your dev server to pick up changes.

---

2) Authentication URL configuration (Supabase Dashboard)
- Authentication > URL Configuration
  - Site URL: your production domain or http://localhost:3000 during development
  - Additional Redirect URLs:
    * http://localhost:3000/**
    * https://your-production-domain.com/**
- Email templates: Optional, use SiteURL/RedirectTo template variables.

---

3) Bookings schema (requested)
Table: public.bookings

Columns:
- id: uuid primary key default gen_random_uuid()
- name: text
- email: text
- mobile: text
- requested_time: timestamptz not null
- service_type: text
- notes: text
- status: text not null default 'pending' (allowed: 'pending' | 'approved' | 'rejected')
- created_at: timestamptz not null default now()
- admin_notes: text

RLS policy (requested):
- Allow anonymous insert; only admin can view and update status. Block updates/deletes from anon users.
Implementation approach:
- Enable RLS on bookings.
- Define an admins table (public.admins) that references auth.users(id).
- Policies:
  - to anon: INSERT allowed (for public booking submissions).
  - to authenticated: SELECT/UPDATE/DELETE only when the user is in public.admins.
- Optional: a SECURITY DEFINER function to set status with guard checks.

Recommended indexes:
- idx_bookings_requested_time on requested_time (desc)
- idx_bookings_status on status

Optional unique constraint (prevent double bookings for a given requested_time):
- unique index on requested_time if you only allow one appointment per exact timestamp
  (or change to a time-slot model and unique(day, slot)).

---

4) Idempotent SQL to provision schema and RLS policies
Run this in Supabase SQL Editor (or via SupabaseTool_run_sql after env vars are set).

-- extensions (for gen_random_uuid)
create extension if not exists pgcrypto;

-- admins table to designate staff/admin users
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- bookings table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  mobile text,
  requested_time timestamptz not null,
  service_type text,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  admin_notes text
);

-- helpful indexes
create index if not exists idx_bookings_requested_time on public.bookings (requested_time desc);
create index if not exists idx_bookings_status on public.bookings (status);

-- optional: prevent double-booking the same exact timestamp
-- create unique index if not exists idx_bookings_unique_requested_time on public.bookings (requested_time);

-- enable row level security
alter table public.bookings enable row level security;

-- allow anonymous inserts (public booking submissions)
create policy if not exists "anon can insert bookings" on public.bookings
for insert
to anon
with check (true);

-- admins can view all bookings
create policy if not exists "admin can select bookings" on public.bookings
for select
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- admins can update bookings (approve/reject, add admin_notes)
create policy if not exists "admin can update bookings" on public.bookings
for update
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- admins can delete bookings (optional)
create policy if not exists "admin can delete bookings" on public.bookings
for delete
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- optional: controlled status update function with admin guard
create or replace function public.set_booking_status(p_id uuid, p_status text, p_admin_notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then
    raise exception 'Only admins can update booking status';
  end if;

  if p_status not in ('pending','approved','rejected') then
    raise exception 'Invalid status %', p_status;
  end if;

  update public.bookings
  set status = p_status,
      admin_notes = coalesce(p_admin_notes, admin_notes)
  where id = p_id;
end;
$$;

grant execute on function public.set_booking_status(uuid, text, text) to authenticated;

---

5) Assigning admin access
Option A (recommended):
- Have the staff user sign up/sign in via your app.
- In Supabase SQL Editor, add them to public.admins with their auth.users.id:

insert into public.admins(user_id) values ('<AUTH_USER_UUID>');

You can fetch AUTH_USER_UUID by running:
select id, email from auth.users order by created_at desc limit 10;

Option B:
- Use Supabase Dashboard Policies and Groups (if using organizations/teams) to gate with group membership instead of public.admins. Adjust policies accordingly.

---

6) How to apply using tools (after env vars are set)
Run these in order:

1. SupabaseTool_list_tables
   - Purpose: Validate connectivity and see if 'bookings' exists.

2. SupabaseTool_create_table
   - table_name: "bookings"
   - columns:
     - { name: "id", type: "uuid", default: "gen_random_uuid()" }
     - { name: "name", type: "text" }
     - { name: "email", type: "text" }
     - { name: "mobile", type: "text" }
     - { name: "requested_time", type: "timestamptz" }
     - { name: "service_type", type: "text" }
     - { name: "notes", type: "text" }
     - { name: "status", type: "text", default: "'pending'" }
     - { name: "created_at", type: "timestamptz", default: "now()" }
     - { name: "admin_notes", type: "text" }

3. SupabaseTool_run_sql
   - Apply: extensions, public.admins table, RLS policies, indexes, and optional set_booking_status function (the SQL above).

4. Document results
   - Update this file with “Status: COMPLETE”, list created objects, and any policy notes.

Validation queries:
- select count(*) from public.bookings;
- select * from public.bookings limit 1; (should only work for admins)
- call function as admin: select public.set_booking_status('<booking_uuid>', 'approved', 'See you soon!');

---

7) Frontend integration notes (already scaffolded)
Files in nail_art_frontend/src:
- utils/getURL.js: returns environment-aware site URL (used for auth redirects).
- utils/supabaseClient.js: Supabase client (requires @supabase/supabase-js).
- utils/authClient.js: sign-up/reset/magic link/OAuth helpers (use getURL redirects).
- components/AuthCallback.jsx: auth callback handler.

Important:
- Never hardcode URLs. Use environment variables and getURL().
- Always pass emailRedirectTo/redirectTo with getURL() in auth flows.
- Configure Authentication > URL Configuration in the Supabase Dashboard.

Install the client library after env vars are provided:
npm i @supabase/supabase-js

---

8) Notifications plan (SMS to admin; SMS to requester on approve/reject)
Two suggested approaches:

A) Supabase Edge Functions (recommended)
- Create an Edge Function that:
  - Listens for database changes via Supabase Realtime or is invoked by your admin UI.
  - Sends SMS via your provider (e.g., Twilio).
- On INSERT into bookings: notify admin number(s).
- On status change to approved/rejected: notify requester (via mobile) with appointment details.

B) Postgres trigger + http extension (advanced)
- Use the http extension to POST to your SMS provider’s API from a trigger function.
- Store provider credentials in Vault/Secrets; restrict access.
- Pros: fully server-side; Cons: secret handling and retry logic are more complex.

Edge Functions telemetry and secret management are typically simpler for SMS.

---

9) Troubleshooting
- "Invalid URL" or "run_sql not found":
  - Ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in .env.
  - Confirm the URL is the Project URL from Project Settings > API (not the storage URL).
- Auth redirect failures:
  - Verify Authentication > URL Configuration in the Supabase dashboard.
  - Make sure all auth helpers use getURL() for dynamic redirects.
- RLS denies access unexpectedly:
  - Check the current auth context and that your admin user is present in public.admins.

---

History:
- Attempt 1: Tools failed (Invalid URL) – env vars not present.
- Attempt 2 (this run): Tools failed with PGRST202 – environment still not configured; documented exact schema and policies ready to apply.

Once environment variables are set, re-run the tools to provision the table and policies automatically, or paste the SQL above into the Supabase SQL Editor.
