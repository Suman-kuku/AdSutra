-- Records which intent the router picked for each turn.
--
-- Save needs to tell a fresh promo (a CREATE turn) from a refinement of the
-- one already saved (an EDIT turn): the first starts a new `promos` lineage,
-- the second adds a version to the existing one. `messages` is append-only by
-- policy, so a row cannot be stamped with this after the fact — it has to be
-- written at insert time.
--
-- Written idempotently: the column may already exist if the statements were
-- applied by hand in the SQL editor before this file was committed.

do $$
begin
  create type message_intent as enum ('CREATE', 'EDIT', 'QUESTION');
exception
  when duplicate_object then null;
end
$$;

alter table messages add column if not exists intent message_intent;

-- Every Save asks "was there a successful CREATE turn after this timestamp?".
create index if not exists messages_create_turns_idx
  on messages (conversation_id, created_at desc)
  where intent = 'CREATE' and error is null;
