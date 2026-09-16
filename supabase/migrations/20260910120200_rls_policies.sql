-- =============================================================================
-- 0003 — Row Level Security
-- Model: creator sees only their own shows/episodes/chats/promos.
--        admin reads everything, writes only moderation fields.
-- Express uses the service_role key and bypasses RLS — these policies are the
-- second line of defence and what protects direct client-side queries.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers (security definer so they don't recurse through RLS)
-- -----------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from people
     where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function owns_show(p_show_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from shows where id = p_show_id and owner_id = auth.uid()
  );
$$;

create or replace function owns_episode(p_episode_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from episodes e
      join shows s on s.id = e.show_id
     where e.id = p_episode_id and s.owner_id = auth.uid()
  );
$$;

create or replace function owns_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversations where id = p_conversation_id and created_by = auth.uid()
  );
$$;

create or replace function owns_promo(p_promo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from promos p
      join episodes e on e.id = p.episode_id
      join shows s    on s.id = e.show_id
     where p.id = p_promo_id and s.owner_id = auth.uid()
  );
$$;

grant execute on function is_admin, owns_show, owns_episode, owns_conversation, owns_promo
  to authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
alter table people            enable row level security;
alter table shows             enable row level security;
alter table episodes          enable row level security;
alter table skill_files       enable row level security;
alter table conversations     enable row level security;
alter table messages          enable row level security;
alter table promos            enable row level security;
alter table promo_performance enable row level security;
alter table skill_file_stats  enable row level security;

-- -----------------------------------------------------------------------------
-- people
-- -----------------------------------------------------------------------------
create policy people_select_self_or_admin on people
  for select to authenticated
  using (id = auth.uid() or is_admin());

create policy people_update_self on people
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from people p2 where p2.id = auth.uid()));
  -- role changes are admin-only, via the service role in Express

-- -----------------------------------------------------------------------------
-- shows
-- -----------------------------------------------------------------------------
create policy shows_select on shows
  for select to authenticated
  using (owner_id = auth.uid() or is_admin());

create policy shows_insert on shows
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy shows_update on shows
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy shows_delete on shows
  for delete to authenticated
  using (owner_id = auth.uid() or is_admin());

-- -----------------------------------------------------------------------------
-- episodes
-- -----------------------------------------------------------------------------
create policy episodes_select on episodes
  for select to authenticated
  using (owns_show(show_id) or is_admin());

create policy episodes_insert on episodes
  for insert to authenticated
  with check (owns_show(show_id));

create policy episodes_update on episodes
  for update to authenticated
  using (owns_show(show_id))
  with check (owns_show(show_id));

create policy episodes_delete on episodes
  for delete to authenticated
  using (owns_show(show_id) or is_admin());

-- -----------------------------------------------------------------------------
-- skill_files — readable by everyone (that's the point of the shared library),
-- uploadable by any creator, deletable by admins only.
-- -----------------------------------------------------------------------------
create policy skill_files_select_all on skill_files
  for select to authenticated
  using (true);

create policy skill_files_insert on skill_files
  for insert to authenticated
  with check (uploaded_by = auth.uid());

create policy skill_files_update_owner_or_admin on skill_files
  for update to authenticated
  using (uploaded_by = auth.uid() or is_admin())
  with check (uploaded_by = auth.uid() or is_admin());

create policy skill_files_delete_admin on skill_files
  for delete to authenticated
  using (is_admin());

-- -----------------------------------------------------------------------------
-- conversations — admin read access is the "view everyone's chat history" rule
-- -----------------------------------------------------------------------------
create policy conversations_select on conversations
  for select to authenticated
  using (created_by = auth.uid() or is_admin());

create policy conversations_insert on conversations
  for insert to authenticated
  with check (created_by = auth.uid() and owns_episode(episode_id));

create policy conversations_update on conversations
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy conversations_delete on conversations
  for delete to authenticated
  using (created_by = auth.uid() or is_admin());

-- -----------------------------------------------------------------------------
-- messages — immutable transcript: insert + select only, no update/delete
-- -----------------------------------------------------------------------------
create policy messages_select on messages
  for select to authenticated
  using (owns_conversation(conversation_id) or is_admin());

create policy messages_insert on messages
  for insert to authenticated
  with check (owns_conversation(conversation_id));

-- -----------------------------------------------------------------------------
-- promos
-- -----------------------------------------------------------------------------
create policy promos_select on promos
  for select to authenticated
  using (owns_episode(episode_id) or is_admin());

create policy promos_insert on promos
  for insert to authenticated
  with check (owns_episode(episode_id) and created_by = auth.uid());

create policy promos_update on promos
  for update to authenticated
  using (owns_episode(episode_id) or is_admin())
  with check (owns_episode(episode_id) or is_admin());

create policy promos_delete on promos
  for delete to authenticated
  using (owns_episode(episode_id) or is_admin());

-- -----------------------------------------------------------------------------
-- promo_performance — report on your own promos; admins verify anyone's
-- -----------------------------------------------------------------------------
create policy promo_performance_select on promo_performance
  for select to authenticated
  using (reported_by = auth.uid() or owns_promo(promo_id) or is_admin());

create policy promo_performance_insert on promo_performance
  for insert to authenticated
  with check (
    reported_by = auth.uid()
    and owns_promo(promo_id)
    and verification = 'self_reported'
  );

create policy promo_performance_update_own on promo_performance
  for update to authenticated
  using (reported_by = auth.uid() and verification = 'self_reported')
  with check (reported_by = auth.uid() and verification = 'self_reported');

create policy promo_performance_update_admin on promo_performance
  for update to authenticated
  using (is_admin())
  with check (is_admin());

create policy promo_performance_delete on promo_performance
  for delete to authenticated
  using (reported_by = auth.uid() or is_admin());

-- -----------------------------------------------------------------------------
-- skill_file_stats — read-only leaderboard data for everyone
-- -----------------------------------------------------------------------------
create policy skill_file_stats_select on skill_file_stats
  for select to authenticated
  using (true);

-- writes happen only through refresh_skill_file_stats() (security definer)
-- or the service role, so no insert/update/delete policies are granted.

-- -----------------------------------------------------------------------------
-- Explicit grants (Supabase default privileges usually cover these)
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on skill_file_leaderboard to authenticated;
revoke insert, update, delete on skill_file_stats from authenticated;
revoke update, delete on messages from authenticated;
