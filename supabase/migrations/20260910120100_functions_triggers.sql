-- =============================================================================
-- 0002 — Functions, triggers, leaderboard view
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger people_set_updated_at            before update on people            for each row execute function set_updated_at();
create trigger shows_set_updated_at             before update on shows             for each row execute function set_updated_at();
create trigger episodes_set_updated_at          before update on episodes          for each row execute function set_updated_at();
create trigger skill_files_set_updated_at       before update on skill_files       for each row execute function set_updated_at();
create trigger conversations_set_updated_at     before update on conversations     for each row execute function set_updated_at();
create trigger promos_set_updated_at            before update on promos            for each row execute function set_updated_at();
create trigger promo_performance_set_updated_at before update on promo_performance for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- New auth user → people row
-- Optional domain guard: uncomment to restrict Google OAuth to your company.
-- -----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- if new.email not like '%@yourcompany.com' then
  --   raise exception 'Sign-up restricted to company accounts';
  -- end if;

  insert into people (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- -----------------------------------------------------------------------------
-- Skill file versioning: auto-assign next version, deactivate previous
-- -----------------------------------------------------------------------------
create or replace function assign_skill_file_version()
returns trigger
language plpgsql
as $$
declare
  v_max int;
begin
  select max(version) into v_max from skill_files where slug = new.slug;
  new.version := coalesce(v_max, 0) + 1;

  -- pull generation defaults out of frontmatter when not supplied explicitly
  new.default_duration_sec := coalesce(
    new.default_duration_sec,
    (new.frontmatter ->> 'default_duration_sec')::int
  );
  new.model       := coalesce(new.model, new.frontmatter ->> 'model');
  new.description := coalesce(new.description, new.frontmatter ->> 'description');

  return new;
end;
$$;

create trigger skill_files_assign_version
  before insert on skill_files
  for each row execute function assign_skill_file_version();

create or replace function deactivate_prior_skill_versions()
returns trigger
language plpgsql
as $$
begin
  if new.is_active then
    update skill_files
       set is_active = false
     where slug = new.slug
       and id <> new.id
       and is_active;
  end if;
  return null;
end;
$$;

create trigger skill_files_deactivate_prior
  after insert on skill_files
  for each row execute function deactivate_prior_skill_versions();

-- -----------------------------------------------------------------------------
-- Promo lineage: version, root, word count, skill file snapshot
-- -----------------------------------------------------------------------------
create or replace function set_promo_lineage()
returns trigger
language plpgsql
as $$
declare
  v_parent_version int;
  v_parent_root    uuid;
begin
  if new.parent_promo_id is null then
    new.version       := 1;
    new.root_promo_id := new.id;
  else
    select version, coalesce(root_promo_id, id)
      into v_parent_version, v_parent_root
      from promos
     where id = new.parent_promo_id;

    if v_parent_version is null then
      raise exception 'parent promo % not found', new.parent_promo_id;
    end if;

    new.version       := v_parent_version + 1;
    new.root_promo_id := v_parent_root;
  end if;

  -- snapshot the skill file identity so stats survive edits/deletes
  if new.skill_file_id is not null and (new.skill_file_slug is null or new.skill_file_version is null) then
    select slug, version
      into new.skill_file_slug, new.skill_file_version
      from skill_files
     where id = new.skill_file_id;
  end if;

  new.word_count := coalesce(
    array_length(regexp_split_to_array(trim(new.content), '\s+'), 1),
    0
  );

  return new;
end;
$$;

create trigger promos_set_lineage
  before insert on promos
  for each row execute function set_promo_lineage();

-- -----------------------------------------------------------------------------
-- Conversation counters
-- -----------------------------------------------------------------------------
create or replace function touch_conversation()
returns trigger
language plpgsql
as $$
begin
  update conversations
     set message_count   = message_count + 1,
         last_message_at = new.created_at,
         updated_at      = now()
   where id = new.conversation_id;
  return null;
end;
$$;

create trigger messages_touch_conversation
  after insert on messages
  for each row execute function touch_conversation();

-- -----------------------------------------------------------------------------
-- refresh_skill_file_stats()
-- Bayesian-smoothed ranking so low-volume skill files don't top the board.
-- Call from pg_cron every 15 min, or after a performance report is submitted.
-- -----------------------------------------------------------------------------
create or replace function refresh_skill_file_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prior           numeric;
  v_m      constant numeric := 5;   -- smoothing weight ≈ "5 pseudo-observations"
begin
  -- global win rate across all reported outcomes; fallback 0.10 on a cold start
  select coalesce(
           count(*) filter (where outcome = 'winner')::numeric / nullif(count(*), 0),
           0.10
         )
    into v_prior
  from promo_performance;

  with slugs as (
    select distinct slug from skill_files
  ),
  promo_agg as (
    select p.skill_file_slug as slug,
           count(*)                                        as total_promos,
           count(*) filter (where p.status = 'approved')    as approved_promos,
           count(distinct p.created_by)                     as unique_creators,
           avg(p.human_edit_ratio)                          as avg_human_edit,
           max(p.created_at)                                as last_used_at
      from promos p
     where p.skill_file_slug is not null
     group by p.skill_file_slug
  ),
  perf_agg as (
    select p.skill_file_slug as slug,
           count(distinct pp.promo_id)                                                   as reported_outcomes,
           count(distinct pp.promo_id) filter (where pp.outcome = 'winner')              as winners,
           count(distinct pp.promo_id) filter (where pp.outcome = 'underperformed')      as underperformers,
           max(pp.created_at) filter (where pp.outcome = 'winner')                       as last_win_at
      from promo_performance pp
      join promos p on p.id = pp.promo_id
     where p.skill_file_slug is not null
     group by p.skill_file_slug
  )
  insert into skill_file_stats (
    slug, total_promos, approved_promos, unique_creators,
    reported_outcomes, winners, underperformers,
    win_rate, ranking_score, avg_human_edit,
    last_used_at, last_win_at, refreshed_at
  )
  select
    s.slug,
    coalesce(pa.total_promos, 0),
    coalesce(pa.approved_promos, 0),
    coalesce(pa.unique_creators, 0),
    coalesce(fa.reported_outcomes, 0),
    coalesce(fa.winners, 0),
    coalesce(fa.underperformers, 0),
    case when coalesce(fa.reported_outcomes, 0) > 0
         then round(fa.winners::numeric / fa.reported_outcomes, 4)
    end,
    round(
      (coalesce(fa.winners, 0) + v_m * v_prior)
      / (coalesce(fa.reported_outcomes, 0) + v_m),
      4
    ),
    round(pa.avg_human_edit, 3),
    pa.last_used_at,
    fa.last_win_at,
    now()
  from slugs s
  left join promo_agg pa on pa.slug = s.slug
  left join perf_agg  fa on fa.slug = s.slug
  on conflict (slug) do update set
    total_promos      = excluded.total_promos,
    approved_promos   = excluded.approved_promos,
    unique_creators   = excluded.unique_creators,
    reported_outcomes = excluded.reported_outcomes,
    winners           = excluded.winners,
    underperformers   = excluded.underperformers,
    win_rate          = excluded.win_rate,
    ranking_score     = excluded.ranking_score,
    avg_human_edit    = excluded.avg_human_edit,
    last_used_at      = excluded.last_used_at,
    last_win_at       = excluded.last_win_at,
    refreshed_at      = excluded.refreshed_at;

  -- drop stats for slugs whose skill files were deleted
  delete from skill_file_stats st
   where not exists (select 1 from skill_files sf where sf.slug = st.slug);
end;
$$;

-- Schedule it (requires the pg_cron extension — enable in the Supabase dashboard):
-- select cron.schedule('refresh-skill-file-stats', '*/15 * * * *', $$select refresh_skill_file_stats()$$);

-- -----------------------------------------------------------------------------
-- skill_file_leaderboard — active version + stats, ready for the picker
-- -----------------------------------------------------------------------------
create or replace view skill_file_leaderboard
with (security_invoker = true)
as
select
  sf.id,
  sf.slug,
  sf.version,
  sf.name,
  sf.category,
  sf.description,
  sf.tags,
  sf.default_duration_sec,
  sf.created_at            as uploaded_at,
  sf.uploaded_by,
  coalesce(st.total_promos, 0)      as total_promos,
  coalesce(st.unique_creators, 0)   as unique_creators,
  coalesce(st.reported_outcomes, 0) as reported_outcomes,
  coalesce(st.winners, 0)           as winners,
  st.win_rate,
  st.ranking_score,
  st.avg_human_edit,
  st.last_used_at,
  st.last_win_at,
  coalesce(st.reported_outcomes, 0) >= 5 as has_enough_data,
  coalesce(st.unique_creators, 0)  < 3   as is_untested,
  st.avg_human_edit > 0.5                as needs_revision,
  rank() over (
    partition by sf.category
    order by st.ranking_score desc nulls last
  ) as category_rank
from skill_files sf
left join skill_file_stats st on st.slug = sf.slug
where sf.is_active;

comment on view skill_file_leaderboard is
  'One row per active skill file with performance stats. Rank within category — never globally — so a mystery skill file is not buried by a drama one.';