-- =============================================================================
-- 0004 — Storage buckets + policies
-- Path conventions:
--   scripts/{show_id}/{episode_id}/{filename}.pdf
--   skill-files/{slug}/v{version}.md
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('scripts', 'scripts', false, 26214400,  -- 25 MB
   array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']),
  ('skill-files', 'skill-files', false, 1048576,  -- 1 MB
   array['text/markdown', 'text/plain'])
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- scripts bucket — scoped by show ownership (first path segment = show_id)
-- -----------------------------------------------------------------------------
create policy scripts_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'scripts'
    and (owns_show(((storage.foldername(name))[1])::uuid) or is_admin())
  );

create policy scripts_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'scripts'
    and owns_show(((storage.foldername(name))[1])::uuid)
  );

create policy scripts_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'scripts'
    and owns_show(((storage.foldername(name))[1])::uuid)
  );

create policy scripts_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'scripts'
    and (owns_show(((storage.foldername(name))[1])::uuid) or is_admin())
  );

-- -----------------------------------------------------------------------------
-- skill-files bucket — shared library: all read, all upload, admin delete
-- -----------------------------------------------------------------------------
create policy skill_files_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'skill-files');

create policy skill_files_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'skill-files' and owner = auth.uid());

create policy skill_files_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'skill-files' and is_admin());