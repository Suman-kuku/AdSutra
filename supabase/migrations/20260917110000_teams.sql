-- =============================================================================
-- 0009 — Teams
--
-- A team is a named group of people, created and managed by admins. This
-- migration adds the group only: it changes nobody's permissions and nothing
-- about what anyone can see. Team-based sharing of shows is a separate,
-- later migration that rewrites the `_select` policies on shows, episodes,
-- conversations, messages and promos.
-- =============================================================================

create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- The team outlives the admin who made it, so this goes null rather than
  -- cascading a whole team away with a departing person.
  created_by  uuid references people (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- "Scaling Pod" and "scaling pod" are the same team to a human, so they are
-- the same team here.
create unique index teams_name_unique on teams (lower(name));

comment on table teams is 'Named group of people. Admin-managed; grants nothing on its own.';

create table team_members (
  team_id    uuid not null references teams (id) on delete cascade,
  person_id  uuid not null references people (id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (team_id, person_id)
);

-- "which teams is this person on" — the direction the primary key cannot serve.
create index team_members_person_idx on team_members (person_id);

create trigger teams_set_updated_at
  before update on teams
  for each row execute function set_updated_at();

alter table teams        enable row level security;
alter table team_members enable row level security;

-- Everyone signed in can see the teams and who is on them: a creator needs to
-- know which team they are on, and the list is not sensitive.
create policy teams_select on teams
  for select to authenticated
  using (true);

create policy teams_insert_admin on teams
  for insert to authenticated
  with check (is_admin());

create policy teams_update_admin on teams
  for update to authenticated
  using (is_admin())
  with check (is_admin());

create policy teams_delete_admin on teams
  for delete to authenticated
  using (is_admin());

create policy team_members_select on team_members
  for select to authenticated
  using (true);

create policy team_members_insert_admin on team_members
  for insert to authenticated
  with check (is_admin());

create policy team_members_delete_admin on team_members
  for delete to authenticated
  using (is_admin());
