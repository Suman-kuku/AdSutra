-- =============================================================================
-- 0001 — Enums, tables, indexes
-- Promo generation platform: people → shows → episodes → conversations → promos
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type user_role           as enum ('admin', 'creator');
create type episode_status      as enum ('uploaded', 'parsing', 'ready', 'failed');
create type message_role        as enum ('user', 'assistant', 'system');
create type promo_source        as enum ('generated', 'refined', 'human_edited');
create type promo_status        as enum ('draft', 'approved', 'archived');
create type performance_outcome as enum ('winner', 'good', 'neutral', 'underperformed');
create type verification_status as enum ('self_reported', 'verified');

-- -----------------------------------------------------------------------------
-- people — application mirror of auth.users
-- -----------------------------------------------------------------------------
create table people (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text        not null unique,
  name        text,
  avatar_url  text,
  role        user_role   not null default 'creator',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table people is 'Application profile + role for each authenticated user.';

-- -----------------------------------------------------------------------------
-- shows — owned by one person, holds many episodes
-- -----------------------------------------------------------------------------
create table shows (
  id                     uuid primary key default gen_random_uuid(),
  owner_id               uuid not null references people (id) on delete cascade,
  title                  text not null,
  description            text,
  genre                  text,
  language               text default 'hindi',
  default_skill_file_id  uuid,                        -- FK added in 0002 (skill_files created below)
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint shows_title_not_blank check (length(trim(title)) > 0)
);

create index shows_owner_idx on shows (owner_id, created_at desc);
create index shows_genre_idx on shows (genre) where genre is not null;

-- -----------------------------------------------------------------------------
-- episodes — one uploaded script per episode
-- -----------------------------------------------------------------------------
create table episodes (
  id              uuid primary key default gen_random_uuid(),
  show_id         uuid not null references shows (id) on delete cascade,
  episode_number  int  not null,
  title           text,

  -- script file (Supabase Storage: scripts/{show_id}/{episode_id}/{filename})
  script_path     text,
  script_filename text,
  script_mime     text,
  file_size       bigint,
  page_count      int,

  -- parsed content
  extracted_text  text,          -- full script text
  script_digest   text,          -- cached summary: characters, beats, tone, key lines
  digest_model    text,

  status          episode_status not null default 'uploaded',
  parse_error     text,

  created_by      uuid references people (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint episodes_number_positive check (episode_number > 0),
  constraint episodes_unique_number   unique (show_id, episode_number)
);

create index episodes_show_idx   on episodes (show_id, episode_number);
create index episodes_status_idx on episodes (status) where status <> 'ready';

-- -----------------------------------------------------------------------------
-- skill_files — uploaded .md prompt files, versioned by slug lineage
-- -----------------------------------------------------------------------------
create table skill_files (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null,        -- lineage key, e.g. 'emotional-promo'
  version               int  not null default 1,

  name                  text not null,
  category              text not null,        -- teaser | character | mystery | drama | ...
  description           text,
  language              text default 'hindi',
  tags                  text[] not null default '{}',

  -- file + parsed contents
  storage_path          text not null,        -- skill-files/{slug}/v{version}.md
  raw_md                text not null,        -- full original file (audit + diffing)
  prompt_body           text not null,        -- md minus frontmatter → sent to the model
  frontmatter           jsonb not null default '{}'::jsonb,

  -- generation defaults pulled from frontmatter
  default_duration_sec  int,
  model                 text,
  temperature           numeric(3, 2),

  is_active             boolean not null default true,
  changelog             text,                 -- why this version exists
  uploaded_by           uuid references people (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint skill_files_version_positive check (version > 0),
  constraint skill_files_unique_version   unique (slug, version),
  constraint skill_files_temp_range       check (temperature is null or temperature between 0 and 2),
  constraint skill_files_slug_format      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index skill_files_slug_idx     on skill_files (slug, version desc);
create index skill_files_category_idx on skill_files (category) where is_active;

-- only one active row per lineage
create unique index skill_files_one_active_per_slug
  on skill_files (slug) where is_active;

alter table shows
  add constraint shows_default_skill_file_fkey
  foreign key (default_skill_file_id) references skill_files (id) on delete set null;

-- -----------------------------------------------------------------------------
-- conversations — one chat thread per episode (per creator)
-- -----------------------------------------------------------------------------
create table conversations (
  id                    uuid primary key default gen_random_uuid(),
  episode_id            uuid not null references episodes (id) on delete cascade,
  created_by            uuid not null references people (id) on delete cascade,
  title                 text,
  active_skill_file_id  uuid references skill_files (id) on delete set null,
  message_count         int not null default 0,
  last_message_at       timestamptz,
  archived              boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index conversations_episode_idx on conversations (episode_id, created_at desc);
create index conversations_creator_idx on conversations (created_by, last_message_at desc nulls last);

-- -----------------------------------------------------------------------------
-- promos — versioned output, refine chain via parent/root
-- -----------------------------------------------------------------------------
create table promos (
  id                  uuid primary key default gen_random_uuid(),
  episode_id          uuid not null references episodes (id) on delete cascade,
  conversation_id     uuid references conversations (id) on delete set null,
  skill_file_id       uuid references skill_files (id) on delete set null,
  skill_file_slug     text,      -- denormalised: survives skill file deletion, groups stats
  skill_file_version  int,       -- snapshot of the exact prompt version used

  content             text not null,
  duration_sec        int,
  word_count          int,

  -- lineage
  version             int not null default 1,
  parent_promo_id     uuid references promos (id) on delete set null,
  root_promo_id       uuid,

  source              promo_source not null default 'generated',
  status              promo_status  not null default 'draft',

  -- how much a human rewrote the model output (0 = untouched, 1 = fully rewritten)
  human_edit_ratio    numeric(4, 3),

  created_by          uuid references people (id) on delete set null,
  approved_by         uuid references people (id) on delete set null,
  approved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint promos_content_not_blank check (length(trim(content)) > 0),
  constraint promos_edit_ratio_range  check (human_edit_ratio is null or human_edit_ratio between 0 and 1),
  constraint promos_no_self_parent    check (parent_promo_id is null or parent_promo_id <> id)
);

create index promos_episode_idx    on promos (episode_id, created_at desc);
create index promos_skill_file_idx on promos (skill_file_id, created_at desc);
create index promos_slug_idx       on promos (skill_file_slug, created_at desc);
create index promos_conv_idx       on promos (conversation_id, version);
create index promos_root_idx       on promos (root_promo_id, version);
create index promos_creator_idx    on promos (created_by, created_at desc);
create index promos_approved_idx   on promos (status) where status = 'approved';

-- -----------------------------------------------------------------------------
-- messages — chat transcript
-- -----------------------------------------------------------------------------
create table messages (
  id             uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  role           message_role not null,
  content        text not null,

  skill_file_id  uuid references skill_files (id) on delete set null,
  promo_id       uuid references promos (id) on delete set null,   -- set when this message emitted a promo

  model          text,
  input_tokens   int,
  output_tokens  int,
  latency_ms     int,
  error          text,

  created_at     timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);
create index messages_promo_idx        on messages (promo_id) where promo_id is not null;

-- -----------------------------------------------------------------------------
-- promo_performance — the market feedback signal
-- -----------------------------------------------------------------------------
create table promo_performance (
  id            uuid primary key default gen_random_uuid(),
  promo_id      uuid not null references promos (id) on delete cascade,
  reported_by   uuid not null references people (id) on delete cascade,

  outcome       performance_outcome not null,
  platform      text,                          -- meta | youtube | in_app | google | ...
  metrics       jsonb not null default '{}'::jsonb,  -- {ctr, views, installs, cpi, roas, watch_through}
  spend         numeric(12, 2),
  currency      text default 'INR',
  period_start  date,
  period_end    date,
  notes         text,

  verification  verification_status not null default 'self_reported',
  verified_by   uuid references people (id) on delete set null,
  verified_at   timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint promo_performance_one_per_reporter unique (promo_id, reported_by),
  constraint promo_performance_period_order    check (period_end is null or period_start is null or period_end >= period_start),
  constraint promo_performance_verified_fields check (
    (verification = 'verified' and verified_by is not null)
    or verification = 'self_reported'
  )
);

create index promo_performance_promo_idx    on promo_performance (promo_id);
create index promo_performance_outcome_idx  on promo_performance (outcome, created_at desc);
create index promo_performance_reporter_idx on promo_performance (reported_by, created_at desc);

-- -----------------------------------------------------------------------------
-- skill_file_stats — aggregated per slug lineage, refreshed by job (see 0002)
-- -----------------------------------------------------------------------------
create table skill_file_stats (
  slug               text primary key,
  total_promos       int     not null default 0,
  approved_promos    int     not null default 0,
  unique_creators    int     not null default 0,
  reported_outcomes  int     not null default 0,
  winners            int     not null default 0,
  underperformers    int     not null default 0,
  win_rate           numeric(5, 4),
  ranking_score      numeric(5, 4),
  avg_human_edit     numeric(4, 3),
  last_used_at       timestamptz,
  last_win_at        timestamptz,
  refreshed_at       timestamptz not null default now()
);

create index skill_file_stats_score_idx on skill_file_stats (ranking_score desc nulls last);

comment on column skill_file_stats.ranking_score is
  'Bayesian-smoothed win rate: (winners + m*prior) / (reported_outcomes + m), m = 5. Prevents 1-of-1 skill files topping the leaderboard.';