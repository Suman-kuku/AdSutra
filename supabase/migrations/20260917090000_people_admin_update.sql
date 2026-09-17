-- =============================================================================
-- 0007 — Admin management of people (People page)
--
-- Express already gates these writes with `requireAdmin` and performs them with
-- the service-role key, which bypasses RLS. CLAUDE.md section 3 asks for both
-- layers, so this adds the missing second one: an admin may change another
-- person's `role` and `is_active`, and nothing else.
--
-- No schema change. Policy only.
-- =============================================================================

-- "Remove access" is `is_active = false`, and role changes come from the same
-- page. Both are other people's rows, which `people_update_self` cannot cover.
drop policy if exists people_update_admin on people;

create policy people_update_admin on people
  for update to authenticated
  using (is_admin())
  with check (
    is_admin()
    -- An admin may not act on themselves here: self-removal or self-demotion
    -- would leave the workspace with one fewer way back in. Express blocks it
    -- too (CANNOT_REMOVE_SELF / CANNOT_CHANGE_OWN_ROLE).
    and id <> auth.uid()
  );
