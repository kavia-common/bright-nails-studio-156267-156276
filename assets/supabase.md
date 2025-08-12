# Supabase Configuration for Bright Nails Studio (Frontend)

Status: PARTIAL (awaiting environment variables; tooling could not connect)

This document captures the Supabase backend configuration for the bookings system, including the schema, row-level security (RLS) policies, and how to complete setup. It also records tool run status for traceability.

Latest verification attempt (this run):
- Goal: Inspect bookings table structure and RLS, confirm anon insert and admin select/update for approve/reject workflow.
- SupabaseTool_list_tables: FAILED with PGRST202 (public.run_sql not found).
- SupabaseTool_create_table: FAILED with PGRST202 (public.run_sql not found).
- SupabaseTool_run_sql: FAILED with PGRST202 (public.run_sql not found).
- Root cause: Environment variables are not present (container_env = None). Without REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY, the SupabaseTools cannot connect to your project.

Conclusion for this verification attempt:
- bookings table: Unknown (not verifiable in this run)
- RLS policies: Unknown (not verifiable in this run)
- Required action: Provide environment variables, then re-run the tools to auto-provision and verify.

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

3) Target Bookings Schema (expected)
Table: public.bookings

Columns (required):
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

RLS policies (expected):
- Enable RLS on public.bookings.
- Allow anonymous INSERT (for public booking submissions).
- Restrict SELECT/UPDATE/DELETE to "admins" only.

Admin model:
- public.admins table with user_id uuid primary key referencing auth.users(id).
- Policies use exists (select 1 from public.admins a where a.user_id = auth.uid()).

Recommended indexes:
- idx_bookings_requested_time on requested_time (desc)
- idx_bookings_status on status

Optional unique constraint (prevent double bookings for a given requested_time):
- unique on requested_time (or model timeslots differently and unique(day, slot)).

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

5) Verification checklist (what to check after env is set)
Use these queries in the SQL Editor or SupabaseTools:

Schema checks:
- select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema='public' and table_name='bookings'
  order by ordinal_position;

- Expected columns: id(uuid default gen_random_uuid()), name(text), email(text), mobile(text),
  requested_time(timestamptz not null), service_type(text), notes(text), status(text default 'pending'),
  created_at(timestamptz default now()), admin_notes(text).

RLS checks:
- select schemaname, tablename, policyname, roles, cmd, qual, with_check
  from pg_policies
  where tablename='bookings';

- Ensure:
  - "anon can insert bookings" exists with cmd=INSERT and role=anon, with_check=(true)
  - "admin can select bookings" exists with cmd=SELECT and role=authenticated using admin membership
  - "admin can update bookings" exists for UPDATE with using/with_check enforcing admin membership
  - (Optional) "admin can delete bookings" exists for DELETE

Enablement:
- select relrowsecurity, relforcerowsecurity from pg_class where relname='bookings';
  - relrowsecurity should be true.

Functional test (as admin):
- Insert a row (as anon or via SQL) and then:
  select public.set_booking_status('<booking_uuid>', 'approved', 'See you soon!');

Access control test:
- As anon: insert into public.bookings (name, email, mobile, requested_time, service_type, notes)
  values ('Test User','test@example.com','555-000-0000', now() + interval '1 day', 'Mini Mani', 'N/A');
  - Expect: success.
- As anon: select * from public.bookings; 
  - Expect: denied by RLS.
- As admin (authenticated user in public.admins): select/update should succeed.

---

6) Assigning admin access
Option A (recommended):
- Have the staff user sign up/sign in via your app.
- In Supabase SQL Editor, add them to public.admins with their auth.users.id:

insert into public.admins(user_id) values ('<AUTH_USER_UUID>');

You can fetch AUTH_USER_UUID by running:
select id, email from auth.users order by created_at desc limit 10;

Option B:
- Use Supabase Dashboard Policies and Groups (if using organizations/teams) to gate with group membership instead of public.admins. Adjust policies accordingly.

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

8) Notifications plan (Email via Gmail SMTP)

This repo includes a small Node server (nail_art_frontend/server/index.js) using Nodemailer to send emails via Gmail SMTP, without exposing credentials in the frontend.

What it does:
- On new booking (created from the Booking form), the frontend calls POST /api/notify-new-booking to email the admin.
- When an admin updates a booking status to approved/rejected in the Admin Dashboard, the frontend calls POST /api/notify-status-change to email the customer.

Security:
- SMTP credentials are read only on the server from environment variables (NOT prefixed with REACT_APP_), so they are never shipped to the browser.

Setup steps:
1) Copy nail_art_frontend/.env.example to nail_art_frontend/.env and fill in:
   - REACT_APP_SUPABASE_URL
   - REACT_APP_SUPABASE_ANON_KEY
   - REACT_APP_SITE_URL (e.g., http://localhost:3000)
   - SMTP_HOST=smtp.gmail.com
   - SMTP_PORT=465
   - SMTP_USER=your_gmail_account@gmail.com
   - SMTP_PASS=your_gmail_app_password  (use a Gmail App Password)
   - ADMIN_EMAIL=your_gmail_account@gmail.com
   - SITE_URL=http://localhost:3000
   - PORT=4000

2) Install dependencies:
   npm i

3) Run servers (in two terminals or using a process manager):
   - Email server: npm run server  (listens on http://localhost:4000)
   - Frontend:     npm start        (CRA dev server; proxied API calls to :4000)

Notes:
- In production, deploy the Node email server separately (e.g., Render, Railway, Fly.io, or your own VPS) and route /api/* to it (update BASE URL in src/utils/emailApi.js if not using the CRA dev proxy).
- Never commit .env with real credentials.
- If you prefer Supabase Edge Functions instead of a Node server, you can adapt this by using an email provider with an HTTP API (e.g., Resend, Mailgun) and store secrets with supabase secrets. Direct Gmail SMTP via Edge Functions is not supported via Nodemailer since Edge Functions run on Deno.

Troubleshooting:
- If emails aren’t sending: verify SMTP_USER/PASS and that you are using a Gmail App Password; check server logs.
- If frontend can’t reach the server: ensure npm run server is running and that the CRA proxy is set to http://localhost:4000 in package.json.

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
- Attempt 2: Tools failed with PGRST202 – environment still not configured; documented exact schema and policies ready to apply.
- Attempt 3 (this run): Verification requested; tools failed again with PGRST202 due to missing env vars. Documented expected schema, policies, and a verification checklist.

Once environment variables are set, re-run the tools to provision/verify the table and policies automatically, or paste the SQL above into the Supabase SQL Editor.
