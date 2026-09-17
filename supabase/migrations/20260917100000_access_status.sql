-- =============================================================================
-- 0008 — Waitlist: approval gate on first sign-in
--
-- Until now, any @kukufm.com Google account that signed in got a `people` row
-- from `handle_new_user` and immediate creator access. `is_active` could not
-- express "has never been approved", so this adds the third state.
--
--   pending  — signed in once, waiting for an admin. No access.
--   approved — can use the app.
--   denied   — rejected from the waitlist, or removed from the People page.
--              One state for both, so Approve un-does either.
--
-- `is_active` becomes a generated column over `access_status`, so every
-- existing policy, function and DTO that reads it keeps working and there is
-- still only one value anyone writes.
-- =============================================================================

create type access_status as enum ('pending', 'approved', 'denied');

-- New signups land here. Existing rows are backfilled below, before the
-- default can affect anyone.
alter table people add column access_status access_status not null default 'pending';

update people
   set access_status = case when is_active then 'approved'::access_status
                                           else 'denied'::access_status end;

-- `is_active` is now derived. Dropping and re-adding it keeps the name every
-- reader already uses while making `access_status` the only writable state.
alter table people drop column is_active;

alter table people
  add column is_active boolean
  generated always as (access_status = 'approved') stored;

create index people_access_status_idx on people (access_status);

-- Re-created against the column it now really depends on. Same result as
-- before — an approved admin — just stated directly.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from people
     where id = auth.uid() and role = 'admin' and access_status = 'approved'
  );
$$;

comment on column people.access_status is
  'Approval gate. pending = awaiting an admin; denied = rejected or removed.';
