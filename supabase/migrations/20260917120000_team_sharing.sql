-- =============================================================================
-- 0010 — Team sharing
--
-- People on the same team work on each other's material as if it were their
-- own: they see each other's shows, episodes, chats and promos, and can create,
-- edit and DELETE in them. Deleting an episode still cascades its conversations,
-- messages, promos and performance reports — so a teammate can now do that to
-- your work, with no undo. That is the intended rule, stated here so it is not
-- a surprise later.
--
-- Access is computed on every query, never copied: taking someone off a team
-- revokes it immediately, and putting them on one grants it retroactively to
-- everything their new teammates already own.
--
-- The existing `owns_*` helpers are left in place, unused by these policies,
-- for anything that must stay strictly the owner's.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers. Security definer so they don't recurse back through RLS.
-- -----------------------------------------------------------------------------

-- Do I share any team with this person?
create or replace function shares_team_with(p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from team_members mine
      join team_members theirs on theirs.team_id = mine.team_id
     where mine.person_id = auth.uid()
       and theirs.person_id = p_person_id
  );
$$;

create or replace function can_use_show(p_show_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from shows s
     where s.id = p_show_id
       and (s.owner_id = auth.uid() or shares_team_with(s.owner_id))
  );
$$;

create or replace function can_use_episode(p_episode_id uuid)
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
     where e.id = p_episode_id
       and (s.owner_id = auth.uid() or shares_team_with(s.owner_id))
  );
$$;

-- A chat is reachable two ways: its author is a teammate, or it hangs off an
-- episode I can already use. Skill file chats have no episode, which is why the
-- first branch exists.
create or replace function can_use_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversations c
     where c.id = p_conversation_id
       and (
         c.created_by = auth.uid()
         or shares_team_with(c.created_by)
         or (c.episode_id is not null and can_use_episode(c.episode_id))
       )
  );
$$;

create or replace function can_use_promo(p_promo_id uuid)
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
     where p.id = p_promo_id
       and (s.owner_id = auth.uid() or shares_team_with(s.owner_id))
  );
$$;

grant execute on function
  shares_team_with, can_use_show, can_use_episode, can_use_conversation, can_use_promo
  to authenticated;

-- -----------------------------------------------------------------------------
-- shows — insert is deliberately untouched: you own what you create.
-- -----------------------------------------------------------------------------
drop policy if exists shows_select on shows;
create policy shows_select on shows
  for select to authenticated
  using (owner_id = auth.uid() or shares_team_with(owner_id) or is_admin());

drop policy if exists shows_update on shows;
create policy shows_update on shows
  for update to authenticated
  using (owner_id = auth.uid() or shares_team_with(owner_id))
  with check (owner_id = auth.uid() or shares_team_with(owner_id));

drop policy if exists shows_delete on shows;
create policy shows_delete on shows
  for delete to authenticated
  using (owner_id = auth.uid() or shares_team_with(owner_id) or is_admin());

-- -----------------------------------------------------------------------------
-- episodes
-- -----------------------------------------------------------------------------
drop policy if exists episodes_select on episodes;
create policy episodes_select on episodes
  for select to authenticated
  using (can_use_show(show_id) or is_admin());

drop policy if exists episodes_insert on episodes;
create policy episodes_insert on episodes
  for insert to authenticated
  with check (can_use_show(show_id));

drop policy if exists episodes_update on episodes;
create policy episodes_update on episodes
  for update to authenticated
  using (can_use_show(show_id))
  with check (can_use_show(show_id));

drop policy if exists episodes_delete on episodes;
create policy episodes_delete on episodes
  for delete to authenticated
  using (can_use_show(show_id) or is_admin());

-- -----------------------------------------------------------------------------
-- conversations — this is "see each other's chat".
-- -----------------------------------------------------------------------------
drop policy if exists conversations_select on conversations;
create policy conversations_select on conversations
  for select to authenticated
  using (
    created_by = auth.uid()
    or shares_team_with(created_by)
    or (episode_id is not null and can_use_episode(episode_id))
    or is_admin()
  );

-- Same two-branch shape as migration 0006: a skill file chat has no episode,
-- and skill files are a shared library open to every creator.
drop policy if exists conversations_insert on conversations;
create policy conversations_insert on conversations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (kind = 'episode'    and can_use_episode(episode_id))
      or
      (kind = 'skill_file' and skill_file_slug is not null)
    )
  );

drop policy if exists conversations_update on conversations;
create policy conversations_update on conversations
  for update to authenticated
  using (created_by = auth.uid() or shares_team_with(created_by))
  with check (created_by = auth.uid() or shares_team_with(created_by));

drop policy if exists conversations_delete on conversations;
create policy conversations_delete on conversations
  for delete to authenticated
  using (created_by = auth.uid() or shares_team_with(created_by) or is_admin());

-- -----------------------------------------------------------------------------
-- messages — still append-only. Update and delete remain revoked outright.
-- -----------------------------------------------------------------------------
drop policy if exists messages_select on messages;
create policy messages_select on messages
  for select to authenticated
  using (can_use_conversation(conversation_id) or is_admin());

drop policy if exists messages_insert on messages;
create policy messages_insert on messages
  for insert to authenticated
  with check (can_use_conversation(conversation_id));

-- -----------------------------------------------------------------------------
-- promos — `created_by = auth.uid()` stays on insert: a promo records who made
-- it, even when it lives on a teammate's episode.
-- -----------------------------------------------------------------------------
drop policy if exists promos_select on promos;
create policy promos_select on promos
  for select to authenticated
  using (can_use_episode(episode_id) or is_admin());

drop policy if exists promos_insert on promos;
create policy promos_insert on promos
  for insert to authenticated
  with check (can_use_episode(episode_id) and created_by = auth.uid());

drop policy if exists promos_update on promos;
create policy promos_update on promos
  for update to authenticated
  using (can_use_episode(episode_id) or is_admin())
  with check (can_use_episode(episode_id) or is_admin());

drop policy if exists promos_delete on promos;
create policy promos_delete on promos
  for delete to authenticated
  using (can_use_episode(episode_id) or is_admin());

-- -----------------------------------------------------------------------------
-- promo_performance — report on a teammate's promo; one report per person is
-- still enforced by the unique key, and only admins can mark one verified.
-- -----------------------------------------------------------------------------
drop policy if exists promo_performance_select on promo_performance;
create policy promo_performance_select on promo_performance
  for select to authenticated
  using (reported_by = auth.uid() or can_use_promo(promo_id) or is_admin());

drop policy if exists promo_performance_insert on promo_performance;
create policy promo_performance_insert on promo_performance
  for insert to authenticated
  with check (
    reported_by = auth.uid()
    and can_use_promo(promo_id)
    and verification = 'self_reported'
  );
