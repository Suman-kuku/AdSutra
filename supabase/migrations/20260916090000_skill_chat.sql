-- =============================================================================
-- 0006 — skill file chat (CLAUDE.md section 12, build step 9 / C10)
--
-- Skill file chats reuse `conversations` + `messages` rather than a parallel
-- chat system, so they inherit the same append-only transcript, the same admin
-- review path, and the same RLS. That needs three things from `conversations`:
-- a thread that belongs to a slug instead of an episode, a way to tell the two
-- apart, and an insert policy that does not assume an episode exists.
--
-- Written idempotently so a partial run can be repeated safely.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. kind + subject
-- -----------------------------------------------------------------------------
do $$
begin
  create type conversation_kind as enum ('episode', 'skill_file');
exception
  when duplicate_object then null;
end
$$;

alter table conversations
  add column if not exists kind            conversation_kind not null default 'episode',
  add column if not exists skill_file_slug text;

-- Not a foreign key: `skill_files.slug` is unique only together with `version`,
-- and the thread belongs to the slug's whole lineage, not to one version of it.
-- Same reasoning as the denormalised `promos.skill_file_slug`.

-- -----------------------------------------------------------------------------
-- 2. episode_id becomes optional
-- -----------------------------------------------------------------------------
alter table conversations alter column episode_id drop not null;

-- -----------------------------------------------------------------------------
-- 3. exactly one subject per conversation
-- Without this, a row could carry both (or neither) and no reader could tell
-- which chat it belonged to.
-- -----------------------------------------------------------------------------
alter table conversations drop constraint if exists conversations_one_subject;
alter table conversations add constraint conversations_one_subject check (
  (kind = 'episode'    and episode_id      is not null and skill_file_slug is null)
  or
  (kind = 'skill_file' and skill_file_slug is not null and episode_id      is null)
);

-- -----------------------------------------------------------------------------
-- 4. lookup index
-- Every skill file chat turn starts by asking "is there an open thread for this
-- slug and this person?", so that pair is the index.
-- -----------------------------------------------------------------------------
create index if not exists conversations_skill_file_idx
  on conversations (skill_file_slug, created_by)
  where archived = false;

-- -----------------------------------------------------------------------------
-- 5. insert policy
-- The existing policy requires owns_episode(episode_id), which is null for a
-- skill file chat — every insert would fail. Skill files are a shared library
-- (CLAUDE.md section 3): any creator may open a chat on any of them, so the
-- skill_file branch only checks ownership of the conversation itself.
-- -----------------------------------------------------------------------------
drop policy if exists conversations_insert on conversations;
create policy conversations_insert on conversations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (kind = 'episode'    and owns_episode(episode_id))
      or
      (kind = 'skill_file' and skill_file_slug is not null)
    )
  );
