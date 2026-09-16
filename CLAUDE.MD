# CLAUDE.md — ScriptCraft (promo generation platform)

Read this file before writing any code. It defines what we're building, the stack,
the folder layout, the database schema, and — importantly — **how we work**.

---

## 1. How we work (read this first)

**One feature at a time. Stop after each one.**

- Work only on the feature I name. Do not start the next one.
- Before you write code for a feature: post a short plan (files you'll touch, endpoints, types). Wait for my "go".
- After you finish a feature: post a summary of what changed, how to test it manually, and then **stop**. I will review it in the browser before we move on.
- Never scaffold ahead. No placeholder files for future features, no "I also added X while I was there".
- If a feature turns out bigger than expected, split it and tell me — don't silently expand scope.
- If something in this file conflicts with what I ask in chat, ask me which wins.

**How you talk to me (important)**

- Answer exactly what I asked. Nothing else.
- Keep it short and simple. Plain words, not jargon. If a technical word is
  unavoidable, explain it in one short line.
- No extra background, no side topics, no "while I was here I also noticed...".
  If you think something else matters, say it in one line at the end and ask
  if I want it.
- If my question is unclear, ask me one short question instead of guessing.
- If you learn something new that I did not know (a change, a problem, a
  surprise), say it clearly and simply, and say what it means for me.
- Do not repeat what I already know. Do not summarise your own answer twice.

**Code rules**

- TypeScript strict mode, no `any`, no `@ts-ignore`.
- All cross-boundary types and Zod schemas live in `shared/`. Never duplicate a type in frontend and backend.
- Controllers stay thin. Business logic goes in `services/`. Prompt assembly goes in `llm/`.
- Every endpoint validates its input with a Zod schema from `shared/`.
- No secrets in frontend code. The Supabase **service role key** is backend-only.
- Errors: throw typed `AppError`, handle centrally in one Express error middleware. Never leak stack traces.
- Don't add a dependency without telling me what it's for.
- Don't write tests unless I ask.

---

## 2. What we're building

A full-stack web app for my company's content team. Writers already have full show
scripts, episode by episode. They need **promos/ads** generated from those episodes.

Core loop:

1. A creator creates a **show**, then uploads an **episode script** (PDF).
2. They open a **chatbot interface** for that episode and pick a **skill file** —
   a `.md` prompt file that defines a promo style (Emotional Promo, Mystery Promo,
   Character Teaser, etc.).
3. They hit generate → the LLM produces a promo, streamed into the chat.
4. They refine it conversationally ("make it shorter", "focus on Alex",
   "highlight the mystery") or edit the text by hand. Chat turns are drafts —
   nothing is written to the promo library until they click **Save**, which
   commits the current draft as a **new promo version**, never overwriting the
   old one.
5. When a promo runs as an actual ad, they **report its performance**
   (winner / good / neutral / underperformed, plus platform + metrics).
6. Those reports aggregate per skill file. Other creators see which skill files
   actually work in market and start using them. **That feedback loop is the
   point of the product** — the chatbot is just the surface.
7. Every skill file has **its own chat** where it can be questioned and rewritten —
   including by attaching a batch of promos made from it, with what worked and
   what didn't, and asking for a revised version. Saving publishes a new version
   of the skill file. Each version's win rate is tracked separately, so a bad
   revision can be abandoned by tagging an earlier version instead. See section 12.

Skill files are `.md` files with YAML frontmatter, uploaded manually through the UI.
Each upload of the same `slug` becomes a new version. They are a shared library:
any creator can upload one, everyone can read and use all of them.

---

## 3. Roles

- `creator` — sees only their own shows, episodes, conversations, promos.
- `admin` — can read **everyone's** chat history, verify performance reports,
  see global usage. Cannot edit other people's promos.

Enforced in two places: Express middleware (`req.user.role`) and Postgres RLS.

Skill files are the exception to creator scoping: every creator can read, use,
edit and publish new versions of any skill file (the `skill_files_insert` policy
only requires `uploaded_by = auth.uid()`). Only admins can delete one.

---

## 4. Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) |
| Monorepo | npm workspaces |
| Frontend | Vite + React + TypeScript, React Router, TanStack Query, Tailwind |
| Backend | Node + Express |
| DB / Auth / Storage | Supabase (Postgres + RLS, Google OAuth restricted to company domain, Storage) |
| Validation | Zod (shared package) |
| Streaming | SSE (`text/event-stream`) — no WebSockets |
| Markdown parsing | `gray-matter` |
| PDF parsing | `mupdf` (AGPL-3.0) — replaced `pdf-parse`, which dropped Devanagari matras |
| LLM gateway | LiteLLM (OpenAI-compatible) |

---

## 5. Folder structure

```
kaand/
├── .github/workflows/deploy.yml
├── supabase/
│   ├── config.toml
│   └── migrations/                # see section 6
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ui/            # Button, Input, Modal, Badge
│   │   │   └── layout/        # Sidebar, Topbar, AppShell
│   │   ├── context/           # AuthContext, ThemeContext
│   │   ├── features/
│   │   │   ├── authentication/
│   │   │   ├── shows/
│   │   │   ├── episodes/      # upload, script preview, details panel
│   │   │   ├── chat/          # episode chat: message list, composer, SSE hook, refine chips
│   │   │   ├── skill-files/   # library, upload, detail, version history,
│   │   │   │                  # skill file chat + content editor (section 12)
│   │   │   ├── promos/        # inline editor, version history, copy/export
│   │   │   ├── performance/   # report modal, leaderboard
│   │   │   └── admin/
│   │   │       └── (each feature: components/ hooks/ services/ index.ts)
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/api.client.ts
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── config/            # env validation, supabase client, db.ts
│   │   ├── controllers/
│   │   ├── middleware/        # auth, requireAdmin, rateLimit, errorHandler
│   │   ├── models/
│   │   ├── routes/api.router.ts
│   │   ├── services/          # show, episode, promo, skill-file, performance, chat,
│   │   │                      # skill-chat (section 12)
│   │   ├── llm/
│   │   │   ├── client.ts              # provider wrapper + streaming
│   │   │   ├── context-window.ts      # digest long scripts, token budgeting
│   │   │   ├── prompt-builder.ts      # shared assembly helpers only
│   │   │   ├── router/
│   │   │   │   ├── index.ts           # routeMessage(ctx) → RouteDecision
│   │   │   │   └── preconditions.ts   # deterministic short-circuits, no LLM call
│   │   │   └── agents/
│   │   │       ├── intent-classifier/ # classify.ts, prompt.ts
│   │   │       ├── promo-creator/     # run.ts, prompt.ts
│   │   │       ├── promo-editor/      # run.ts, prompt.ts
│   │   │       ├── qa-responder/      # run.ts, prompt.ts
│   │   │       └── skill-editor/      # run.ts, prompt.ts — section 12
│   │   ├── jobs/parse-script.job.ts
│   │   └── app.ts
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
├── shared/
│   ├── src/
│   │   ├── types/
│   │   │   ├── db.ts          # generated: supabase gen types typescript
│   │   │   ├── intent.ts      # Intent, ClassifierResult, RouteDecision, AgentContext
│   │   │   ├── models.ts      # SELECTABLE_MODEL_IDS — composer model picker
│   │   │   ├── skill-chat.ts  # SkillChatRequest, AttachedPromo — section 12
│   │   │   ├── performance.ts # REASON_TAGS vocabulary — section 12, phase B
│   │   │   └── index.ts       # DTOs: PromoDTO, SkillFileDTO, APIResponse
│   │   └── validation/        # Zod schemas shared by both sides
│   ├── package.json
│   └── tsconfig.json
├── eslint.config.js               # ESLint 9 flat config
├── package.json
└── README.md
```

---

## 6. Database schema

> **Current state: all four base migrations are APPLIED.** Pushed 2026-09-11 to the
> Supabase project **Story-Engine** (ref `gbkvfsmdzaegvhjefngb`, ap-south-1) and
> verified in the dashboard. Every table, enum, trigger, function, the
> `skill_file_leaderboard` view, all RLS policies and both storage buckets exist.
> `supabase migration list` shows a matching remote timestamp for all four.
>
> A **fifth** migration was added for build step 8. A **sixth** and **seventh** are
> specified but not yet written — see below.

The migration files live in `supabase/migrations/`:

- `..._init_schema.sql` — enums, tables, indexes
- `..._functions_triggers.sql` — triggers, `refresh_skill_file_stats()`, `skill_file_leaderboard` view
- `..._rls_policies.sql` — RLS helpers + policies
- `..._storage.sql` — `scripts` and `skill-files` buckets + policies
- `20260915090000_message_intent.sql` — **added 2026-09-15 for step 8.** Adds the
  `message_intent` enum and `messages.intent`, plus a partial index on successful
  `CREATE` turns. Save needs it to tell "a new promo" from "a new version of the
  saved one", and `messages` is append-only so the intent must be written at
  insert time. Written idempotently (`if not exists`) because the statements may
  already have been run by hand in the SQL editor.
- `20260916090000_skill_chat.sql` — **not yet written, for step 9.** Makes
  `conversations.episode_id` nullable and adds `conversations.kind`
  (`episode | skill_file`) plus `conversations.skill_file_slug`, so the skill file
  chat reuses the existing conversation/message tables instead of a parallel chat
  system. Also replaces the `conversations_insert` RLS policy, which currently
  assumes every conversation has an episode. See section 12.
- `..._performance_reason_tags.sql` — **not yet written, for step 11.** Adds
  `promo_performance.reason_tags text[]`. See section 12, phase B.

**Do not modify an applied migration file.** If applying one fails, show me the
exact Postgres error and wait — do not rewrite the migration to get past it.
If a later feature needs a schema change, write a **new** timestamped migration
and tell me why.

`shared/src/types/db.ts` is **generated** from this schema — never hand-written.
Regenerate it after any new migration, or it will drift from the real schema:

```
npx supabase@latest gen types typescript \
  --project-id gbkvfsmdzaegvhjefngb --schema public \
  > shared/src/types/db.ts
```

### Tables

**`people`** — mirrors `auth.users`. `id` (= auth uid), `email`, `name`, `avatar_url`,
`role` (`admin|creator`), `is_active`.

**`shows`** — `owner_id → people`, `title`, `description`, `genre`, `language`,
`default_skill_file_id`.

**`episodes`** — `show_id`, `episode_number` (unique per show), `title`,
`script_path` (Storage key), `script_filename`, `script_mime`, `file_size`,
`page_count`, `extracted_text`, `script_digest`, `status`
(`uploaded|parsing|ready|failed`), `parse_error`.
- `DELETE /episodes/:id` (show owner or admin, per `episodes_delete` RLS) deletes
  the row and, via the migration's `on delete cascade` foreign keys, every
  `conversations`/`messages` row under it and every `promos`/`promo_performance`
  row on it too — no app code orders the child deletes. The Storage script file
  is a separate system and is removed as a best-effort step afterward. This is
  the one place data is actually erased, not archived — unlike conversation
  history (section 7's `/archive`), an episode has no "undo."

**`skill_files`** — versioned prompt library. `slug` + `version` (unique together),
`name`, `category`, `description`, `language`, `tags[]`, `storage_path`, `raw_md`,
`prompt_body` (md minus frontmatter), `frontmatter` (jsonb),
`default_duration_sec`, `model`, `temperature`, `is_active`, `changelog`,
`uploaded_by`.
- A DB trigger auto-assigns `version` and deactivates the previous active version.
  **Insert without setting `version`.**
- One active row per `slug`, enforced by a partial unique index.
- Versions are never deleted, and an older one is never reactivated. To go back
  to an earlier version you tag it directly when generating a promo — see
  section 12, "Every version stays usable".
- **Two save paths**, both ending here — see section 12, "Two ways to save":
  *Save as new version* inserts a row; *Save* updates the loaded row in place
  (`PUT /skill-files/:slug/versions/:version`) and creates nothing. In-place
  edit is the one operation that rewrites history rather than appending to it,
  and it is gated by `skill_files_update_owner_or_admin` — uploader or admin only.

**`conversations`** — `episode_id`, `created_by`, `title`,
`active_skill_file_id`, `message_count`, `last_message_at`, `archived`.
- `POST /conversations/:id/archive` sets `archived = true`. This is the
  "delete conversation history" action: `listConversationsForEpisode` already
  filters on `archived = false`, so the thread just drops out of view. Nothing
  is erased — `messages` has no delete policy (see below) — and `promos` rows
  already saved from this conversation are untouched, since they don't
  reference `archived` at all.
- The sixth migration adds `kind` (`episode | skill_file`) and `skill_file_slug`,
  and makes `episode_id` nullable, so skill file chats live here too. A check
  constraint enforces that exactly one of `episode_id` / `skill_file_slug` is set.
- **Clear chat** on the skill file page is this same archive flip. Nothing is erased.

**`messages`** — append-only transcript. `conversation_id`, `role`
(`user|assistant|system`), `content`, `skill_file_id`, `promo_id`, `intent`
(`CREATE|EDIT|QUESTION`, added by the fifth migration), `model`,
`input_tokens`, `output_tokens`, `latency_ms`, `error`.
- **No update or delete.** RLS blocks it. This is what makes admin history review trustworthy.
- Chat turns never set `promo_id` — see section 11, "Drafts vs. saved promos".
  An assistant row with `skill_file_id` set and no `error` is a promo draft
  (`CREATE`/`EDIT`); one with `skill_file_id` null is a QA answer.
- Skill file chat turns (section 12) also live here, distinguished by their
  conversation's `kind`, not by anything on the message row. They reuse the
  existing `intent` values: `EDIT` when the turn proposes a changed skill file,
  `QUESTION` when it only answers.

**`promos`** — versioned output. `episode_id`, `conversation_id`, `skill_file_id`,
`skill_file_slug`, `skill_file_version`, `content`, `duration_sec`, `word_count`,
`version`, `parent_promo_id`, `root_promo_id`, `source`
(`generated|refined|human_edited`), `status` (`draft|approved|archived`),
`human_edit_ratio`, `created_by`, `approved_by`, `approved_at`.
- A trigger derives `version`, `root_promo_id`, `word_count`, and snapshots
  `skill_file_slug`/`skill_file_version`. **Only set `parent_promo_id` and
  `content` — let the trigger do the rest.**
- Refining or hand-editing = **insert a new row** with `parent_promo_id` set.
  Never `UPDATE content`.
- Query a version history with `where root_promo_id = $1 order by version`.
- Chat turns (`CREATE`/`EDIT`) never insert here. Every draft lives only in
  `messages.content` until the user clicks **Save**
  (`POST /conversations/:id/save-promo`), which is what actually inserts a
  row, chained off the last **saved** version — not off every chat draft. See
  section 11.
- `skill_file_slug` is how the skill file chat finds which promos to offer for
  attachment; `skill_file_version` is what makes the v1-vs-v2 comparison in
  section 12 possible without any new column.

**`promo_performance`** — the market signal. `promo_id`, `reported_by`, `outcome`
(`winner|good|neutral|underperformed`), `platform`, `metrics` (jsonb: ctr, views,
installs, cpi, roas, watch_through), `spend`, `currency`, `period_start`,
`period_end`, `notes`, `verification` (`self_reported|verified`), `verified_by`.
- One report per `(promo_id, reported_by)`.
- Creators can only insert `self_reported`. Only admins can set `verified`.
- The seventh migration adds `reason_tags text[]` — *why* it worked or didn't.
  Outcome numbers say which promo won; they never say why. See section 12, phase B.

**`skill_file_stats`** — aggregated per `slug`, refreshed by
`refresh_skill_file_stats()`. Holds `total_promos`, `approved_promos`,
`unique_creators`, `reported_outcomes`, `winners`, `underperformers`, `win_rate`,
`ranking_score`, `avg_human_edit`, `last_used_at`, `last_win_at`.
- `ranking_score` is a Bayesian-smoothed win rate, not raw win rate.
- Call `refresh_skill_file_stats()` after a performance report is created or updated.

**`skill_file_leaderboard`** (view) — active skill file + its stats + derived flags
`has_enough_data`, `is_untested`, `needs_revision`, and `category_rank`.
**The frontend reads ranking from this view. Do not recompute ranking in JS.**

---

## 7. API surface (target — build incrementally)

```
POST   /auth/session                 # verify Supabase JWT, upsert people row
GET    /me

GET    /shows                        # scoped by role
POST   /shows
GET    /shows/:id
GET    /shows/:id/episodes

POST   /episodes/upload-url          # signed Storage upload URL
POST   /episodes                     # register + trigger parse
GET    /episodes/:id
GET    /episodes/:id/script          # BUILT (not in the original list) — extracted text for the script rail
GET    /episodes/:id/script-url      # BUILT (not in the original list) — signed URL to view the original file
DELETE /episodes/:id                 # cascades: conversations, messages, promos, performance reports
GET    /episodes/:id/promos          # every saved promo version on the episode, oldest first

GET    /skill-files                     # ?category= ; ordered by leaderboard score
POST   /skill-files                     # .md upload (JSON text body) → parse → version
GET    /skill-files/:slug
GET    /skill-files/:slug/versions
GET    /skill-files/:slug/versions/:version   # one version's full raw_md — loads it into the editor
PUT    /skill-files/:slug/versions/:version   # Save — edits that version in place, no new row
GET    /skill-files/:slug/promos        # promos made from this slug — also feeds the attach picker
GET    /skill-files/:slug/chat          # the skill file's conversation + messages
POST   /skill-files/:slug/chat          # SSE — one skill file chat turn
POST   /skill-files/:slug/chat/clear    # "Clear chat" — archives the conversation, erases nothing
POST   /skill-files/:slug/publish       # Save — commits edited content as the next version
GET    /skill-files/:slug/version-stats # win rate per version — phase B
GET    /skill-files/:slug/feedback      # promos grouped winners vs losers, with reason tags — phase B

GET    /conversations?episodeId=
POST   /conversations
GET    /conversations/:id/messages   # read transcript only
POST   /conversations/:id/generate   # SSE — THE ONLY episode-chat write endpoint
POST   /conversations/:id/save-promo # commits the current chat draft as a new promos version
POST   /conversations/:id/archive    # "delete history" — flips conversations.archived, nothing erased

DELETE /promos/:id                   # BUILT (not in the original list) — permanently deletes ONE saved version
POST   /promos/:id/edit              # human edit → new version
GET    /promos/:id/versions
POST   /promos/:id/approve
POST   /promos/:id/performance

GET    /leaderboard                  # ?category=
GET    /admin/conversations
GET    /admin/usage
POST   /admin/performance/:id/verify
```

> **Note:** an earlier draft had a separate `POST /conversations/:id/messages`
> for refinement. It is **removed**. Section 11's router decides create vs refine
> vs question, so every episode-chat user turn goes through `/generate`.

> **Live as of 2026-09-15:** everything above **except** these, which are still
> unbuilt — the five skill-file chat routes (`/chat` GET + POST, `/chat/clear`,
> `/publish`, plus `/promos` for the attach picker — step 9),
> `POST /promos/:id/edit` (step 10), `GET /promos/:id/versions` (the service
> function exists, no route yet), `POST /promos/:id/approve`,
> `POST /promos/:id/performance` (step 11), `GET /leaderboard` (step 12),
> `/version-stats` and `/feedback` (step 13), and all three `/admin` routes
> (step 14).

---

## 8. Build order

Do these **in order, one at a time, stopping after each**:
**Don't run migration commands yourself, give the command to me — I will run it.**

0. ~~**Apply the database**~~ — **DONE 2026-09-11.**
1. ~~**Scaffold**~~ — **DONE 2026-09-11.** npm workspaces, tsconfig project references,
   ESLint flat config, Zod env validation, `app.ts` + `GET /health`, Vite + Tailwind.
2. ~~**Auth**~~ — **DONE 2026-09-11.** Google OAuth, `AuthContext`, `auth.middleware.ts`
   (`@kukufm.com` domain), `requireAdmin`, `/auth/session`, `/me`, protected routing.
3. ~~**Shows**~~ — **DONE 2026-09-11.** List + create + detail, RLS-scoped.
4. ~~**Episodes**~~ — **DONE 2026-09-11.** Signed upload, register, list, detail.
5. ~~**Script parsing**~~ — **DONE 2026-09-11.** `mupdf` background job →
   `extracted_text`, `page_count`, status transitions. PDF and plain text only.
6. ~~**Skill file upload**~~ — **DONE 2026-09-11.** `gray-matter`, Zod frontmatter,
   Storage + DB insert, versioning, list/detail/version-history UI.
7. ~~**Generate**~~ — **DONE 2026-09-11.** `llm/client.ts` (LiteLLM), `prompt-builder.ts`,
   `context-window.ts`, SSE `POST /conversations/:id/generate`, streaming chat UI.
8. ~~**Intent routing + refine (C8a)**~~ — **DONE 2026-09-15.** Section 11. Router
   (`preconditions.ts` + `index.ts`), intent classifier, three executor agents,
   `intent` SSE event, refine chips, free-text refine, Regenerate, Save button,
   saved-promo tabs with version history, delete one version. Needed one thing
   section 11 said it would not: **a fifth migration** adding `messages.intent`
   (see section 6). Also added, not in the original spec: a **model picker** in
   the composer (`shared/src/types/models.ts` is the allowed list; classification
   always stays on `CLASSIFIER_MODEL`).
9. **Skill file chat — phase A (C10)** — **NEXT.** Section 12. Two-panel skill file
   page: chat left, editable content right. Ask, rewrite, attach a batch of promos
   with what worked and what didn't, Save as a new version, Clear chat.
   Needs the sixth migration. **Does not depend on performance reporting** — the
   "why" is typed by the user in this phase.
10. **Human edit on promos (C8b)** — Inline editor, `human_edit_ratio`, version
    history UI. `createPromo` already accepts `humanEditRatio`; nothing computes
    or sends it yet, and `POST /promos/:id/edit` does not exist. The saved-promo
    version tabs built in step 8 are read-only.
11. **Performance reporting** — report modal, endpoint, stats refresh. The modal
    must capture `reason_tags` (why it worked / why it didn't), not just the
    outcome dropdown. Needs the seventh migration. Tag vocabulary lives in
    `shared/src/types/performance.ts`; see section 12, phase B.
12. **Leaderboard + picker ranking** — badges, category rank, "Untested" slots.
13. **Skill file chat — phase B (C11)** — Section 12. The attach picker
    auto-fills outcomes and reason tags from `promo_performance` instead of the
    user typing them, plus the winners-vs-losers feedback view and the
    per-version win rate table.
14. **Admin** — all-user chat history, usage, report verification.

---

## 9. Two design constraints not to break

- **Long scripts.** A 12-page script fits in context; a 60-page one plus ten
  refinement turns does not. First generation sends full `extracted_text`.
  Refinement turns send script digest + the current promo + the last ~6 messages
  only. `context-window.ts` owns this budget — no agent computes it itself.
- **Herding.** A visible leaderboard makes everyone converge on two skill files,
  which kills the exploration that produced the winners. So: rank **within
  category**, never globally, and always reserve 1–2 picker slots for skill files
  with `is_untested = true`, labelled as such.

---

## 10. Episode chat page — build breakdown

Three columns: global sidebar (left) · script rail (middle) · chat (right).
Header carries breadcrumbs, episode title, status line, and actions.

| # | Piece | Depends on | Notes |
|---|---|---|---|
| C1 | **App shell** — sidebar nav, breadcrumbs, topbar | — | **NOT DONE.** Only a topbar with Shows / Skill Files links exists. |
| C2 | ~~**Script parsing**~~ | step 5 | **DONE.** |
| C3 | ~~**Script rail**~~ | C2 | **DONE.** Script card + signed-URL View, preview excerpt, details, full-script modal. |
| C4 | ~~**Skill file library**~~ | step 6 | **DONE.** |
| C5 | ~~**Skill file picker in chat**~~ | C4 | **DONE, as an `@`-mention autocomplete in the composer**, not the mockup's 4-card grid — my decision, it scales past four files. Plain list ordering until C9. |
| C6 | ~~**Conversation + transcript**~~ | C4 | **DONE.** Lazy conversation creation, append-only messages, list + composer. |
| C7 | ~~**Generate**~~ | C6, step 7 | **DONE.** SSE stream into chat, Copy, Stop/abort, token + latency readout. |
| C8a | ~~**Intent routing + refine**~~ | C7, step 8 | **DONE 2026-09-15.** See section 11. Includes Save, saved-promo tabs, delete version, model picker. |
| C10 | **Skill file chat — phase A** | C4, step 9 | **NEXT.** Section 12. Chat + content editor + attach promos + Save as version. |
| C8b | **Human edit on promos** | C8a, step 10 | Inline editor, `human_edit_ratio`. Promo version tabs exist but are read-only. |
| C9 | **Picker ranking** | C5, step 12 | Read `skill_file_leaderboard`; see section 9. |
| C11 | **Skill file chat — phase B** | C10, step 13 | Auto-filled outcomes, feedback view, version win rates. |

### In the mockup but NOT supported by the schema — decide before building

| Element | Problem |
|---|---|
| **Templates** (sidebar) | No table, and no definition in section 2. What is it? |
| **My Creations** (sidebar) | Probably "promos I made" — needs an endpoint, no schema change |
| **Trash** (sidebar) | Nothing is soft-deleted. Needs a new migration (`deleted_at`) |
| **Episode Notes** (header) | No `notes` column on `episodes`. Needs a new migration |
| **Notifications** (bell) | No table. In scope at all? |
| **Upgrade to Pro** (sidebar) | Billing — outside section 2's product scope |
| **Output: Text** (composer) | No column for output format on `promos` |
| **Attach** (episode composer paperclip) | Undefined — attach what, stored where? (The skill file chat's paperclip **is** defined — see section 12.) |
| **Help (?)** | Static link, no backend |

Anything in that second table stays **unbuilt** until it is specified. Do not
invent schema for it.

---

## 11. Agent architecture (build step 8 / C8a) — **BUILT 2026-09-15**

> Built as described below, with three changes made during the build:
> 1. **One new migration** (`messages.intent`) — the "No migration" line at the
>    end of this section is out of date. Save could not otherwise tell a new
>    promo from a new version of the saved one.
> 2. **A model picker** in the composer. `/generate` takes an optional `model`,
>    validated against `SELECTABLE_MODEL_IDS` in `shared/src/types/models.ts`.
>    It never applies to classification.
> 3. **Delete one saved promo version** (`DELETE /promos/:id`) — permanent, no
>    undo, cascades that version's performance reports.

A user's message in the chat can mean three different things. Sending the full
script and skill file on every turn is wasteful and, worse, makes the model
regenerate from scratch when the user only wanted a tweak. So one router picks
one executor per turn.

### The three intents

| Intent | Trigger | What the LLM receives |
|---|---|---|
| `CREATE` | First promo, or an explicit new skill file | skill file `prompt_body` + full `extracted_text` + user message |
| `EDIT` | "make it shorter", "add more action", "focus on Alex", "make it narration style", "more dramatic" | script context + **current draft** + last ~6 messages + user message |
| `QUESTION` | "who is Alex?", "why did you pick that hook?" | script context + last ~6 messages + user message |

`EDIT` and `QUESTION` never send the full `extracted_text`.

### Drafts vs. saved promos

Chat turns never touch the `promos` table. `CREATE` and `EDIT` stream their
output into `messages.content` exactly like any other turn — that *is* the
draft. It stays a draft, however many times the user refines it, until they
click **Save** (`POST /conversations/:id/save-promo`), which commits *only
the draft currently in play* as one new `promos` version. Whatever
intermediate drafts got refined past are never separately persisted — only
what existed at the moment of Save.

A draft is identified without any schema change: the latest assistant message
in a conversation with `skill_file_id` set and no `error` is the current
draft (`qa-responder` never sets `skill_file_id`, so QA answers don't count,
and a failed turn's `error` disqualifies it). Because `messages` is
append-only, a saved promo can never be linked back to the specific message
that produced it — the only link is `promos.conversation_id`, plus
`parent_promo_id` chaining to whatever was last **saved** (not to every chat
draft in between).

### Routing order — first match wins, no LLM call until the last step

`llm/router/preconditions.ts` short-circuits deterministically:

1. `forcedIntent` present in the request body (refine chip / Regenerate button) → use it. **No classifier call.**
2. No draft exists in this conversation yet → intent can only be `CREATE` or `QUESTION`. Classify against those two only.
3. Message carries an explicit `@skill-file` mention (the composer only attaches `skillFileId` when its `@mention` picked a file this turn) → `CREATE`.
4. Otherwise → call the intent classifier.

### Intent classifier

- Model: `env.CLASSIFIER_MODEL` (validated in `config/env.ts`). Not the generation model.
- `temperature: 0`, non-streaming, JSON-only output. `max_tokens: 500` — not the
  64 originally specified here: `CLASSIFIER_MODEL` is commonly a reasoning
  model (see `client.ts`), which can burn most of a tiny budget on hidden
  chain-of-thought before emitting a single visible character, producing
  empty/truncated JSON. 500 leaves it room to think and still answer.
- Returns `{ intent, confidence, reason }`, validated by `classifierOutputSchema`.
- **Never throws.** Unparseable or schema-invalid output — e.g. prose wrapped
  around the JSON, or truncation — is treated as `confidence: 0` and falls
  through to the low-confidence fallback below, rather than failing the turn.
- **Low confidence fallback:** if a draft exists in this conversation → default to `EDIT`.
  If none exists → `CREATE` when a skill file is selected, else `QUESTION`.
- Rationale for the `EDIT` default: a wrong `CREATE` throws away the draft the user
  was working on and burns full script context. A wrong `EDIT` just produces a
  weaker answer. Bias toward the cheap mistake.
- The prompt explicitly tells the classifier that once a draft exists, *any*
  request to change its wording, tone, style, format, length, or focus is
  `EDIT`, never `CREATE` — that's what "make this in narration style" needs to
  land on.

### Executor agents

All three live under `llm/agents/` and export the same signature so the controller
stays thin:

```ts
run(ctx: AgentContext): AsyncIterable<StreamChunk>
```

- **`promo-creator`** — assembles skill file + full script + user message.
  Streams the draft into `messages.content`. **Writes no `promos` row.**
- **`promo-editor`** — assembles script context + current draft + last ~6 messages.
  Streams the revised draft into `messages.content`. **Writes no `promos` row.**
- **`qa-responder`** — answers in prose. **Writes no `promos` row.**

None of the three agents touch `promos` at all — see "Drafts vs. saved promos"
above. The only code path that inserts a promo is
`promo.service.ts#saveLatestDraftAsPromo`, run by `POST
/conversations/:id/save-promo`. It sets **only** `content` and
`parent_promo_id` (chained to the last **saved** promo, or null for the
first) — the DB trigger derives `version`, `root_promo_id`, `word_count` and
the skill-file snapshot. **Never `UPDATE` a promo.**

`human_edit_ratio` belongs to the C8b hand-edit path, not to `promo-editor`.

### The one endpoint

```
POST /conversations/:id/generate     # SSE
body: { message: string, skillFileId?: string, forcedIntent?: Intent }
```

SSE events, in order:

| Event | Payload |
|---|---|
| `intent` | `{ intent, confidence, source: 'forced' \| 'precondition' \| 'classifier' }` — emitted first so the UI can show what it's doing |
| `token` | streamed text delta |
| `usage` | `{ model, inputTokens, outputTokens, latencyMs }` |
| `error` | `{ message }` |
| `done` | — |

There is no `promo` event on this stream — `/generate` never touches `promos`.
Saving is a separate, non-streaming request; see "Drafts vs. saved promos".

### Persistence per turn

- Insert the user `messages` row before routing.
- Run the agent, stream the output.
- Insert the assistant `messages` row with `model`, token counts, and `latency_ms`.
  `promo_id` is never set here (see "Drafts vs. saved promos").
- `messages` is append-only. A failed turn still writes an assistant row with `error` set.

### Where code goes

- `shared/src/types/intent.ts` — `Intent`, `ClassifierResult`, `RouteDecision`, `AgentContext`
  (carries `currentDraft: { content } | null`, not a `promos` row), `StreamChunk`
- `shared/src/validation/intent.ts` — `generateRequestSchema`, `classifierOutputSchema`
- `backend/src/services/chat.service.ts` — load state → route → run agent → stream → persist
  (drafts only — never writes `promos`)
- `backend/src/services/promo.service.ts` — `saveLatestDraftAsPromo`, the only path
  that writes to `promos` for chat-produced content
- `backend/src/controllers/conversation.controller.ts` — thin: Zod validate → chat service → SSE plumbing only
- `backend/src/controllers/promo.controller.ts` — `POST /conversations/:id/save-promo`
- `backend/src/llm/prompt-builder.ts` — shrinks to shared helpers. CREATE assembly moves to
  `promo-creator/prompt.ts`; the existing unused `buildRefinementPrompt` moves to
  `promo-editor/prompt.ts`.
- `frontend/src/features/chat/` — `RefineChips.tsx`, `IntentBadge.tsx`, a Save button on
  the promo panel, extend the existing SSE hook for the `intent` event.

~~No new dependencies. No migration.~~ No new dependencies — correct. **One
migration was needed** (`messages.intent`); see the note at the top of this
section and the migration list in section 6.

### Open item — `script_digest`

Section 9 says refinement turns use `episodes.script_digest`, but build step 5 only
populated `extracted_text` and `page_count`. **I have not confirmed whether anything
writes `script_digest`.** Until I do:

- `context-window.ts` exposes `resolveScriptContext(episode)` — returns `script_digest`
  when it is non-null, otherwise truncates `extracted_text` to the same token budget.
- Both `promo-editor` and `qa-responder` call that function. Neither reads the column directly.
- Do not add a migration or backfill job for this without asking me.

---

## 12. Skill file chat (build step 9 = phase A / C10, step 13 = phase B / C11)

Every skill file gets its own chat page. Two panels:

- **Left — Chat with Skill File.** Ask what the file does, ask for changes, or
  attach a batch of promos made from this file and say which worked and which
  didn't.
- **Right — Skill File Content.** The `.md`, editable by hand, and where the
  chat's proposed rewrite lands. **Save** commits it as a new version.

This is the general editing surface for skill files. Improving a file from
market results is one thing you do here, not a separate feature.

### Phase A (step 9) vs phase B (step 13)

| | Phase A — build now | Phase B — after performance reporting |
|---|---|---|
| Where the outcome data comes from | **The user types it.** Attach promos, mark each winner/loser, write why. | Auto-filled from `promo_performance` — outcome, metrics, reason tags. |
| Depends on | Sixth migration only | Steps 11 + 12 |
| Extra UI | — | Winners-vs-losers feedback view, per-version win rate table |

Phase A is deliberately independent of performance reporting. You have promo
results in your head and in spreadsheets today; waiting for the reporting
feature to exist before you can improve a skill file would stall the thing that
matters most.

### The two chat intents

The skill file chat reuses the existing `intent` values from section 11 — no new
enum:

| Intent | Example | Result |
|---|---|---|
| `QUESTION` | "what does this skill file do?", "why does it say never merge sections?" | Prose answer. Content panel untouched. |
| `EDIT` | "make it more punchy", "add a rule about opening with a question", plus any turn with promos attached | Streams a **full revised `.md`** into the content panel, alongside a short prose summary of what changed. |

Routing here is simpler than section 11's — no script, no drafts. If promos are
attached, it is always `EDIT`. Otherwise classify between the two. Reuse
`intent-classifier` with a skill-chat prompt variant; do not write a second
classifier.

### Attaching promos (the paperclip)

1. Paperclip opens a picker listing promos where `promos.skill_file_slug` matches
   this file, newest first, with version and episode shown.
2. The user ticks several, and against each writes **worked / didn't work** plus
   a one-line why.
3. Those go into the turn as structured context, not as pasted prose.

**Batch limits:**

- **Max 8 promos per turn.** More than that and the promo texts crowd out the
  skill file itself in the context window. The UI blocks the 9th with "Send this
  batch first, then attach more."
- **Batches accumulate in the conversation.** Batch 2's turn still has batch 1 in
  the last ~6 messages, so the model reasons across both. Tell the user that in
  the UI — otherwise they will re-attach the same promos every turn.
- `AttachedPromo` lives in `shared/src/types/skill-chat.ts`:
  `{ promoId, version, content, verdict: 'worked' | 'did_not_work' | 'unclear', why?: string }`.

### The agent — `skill-editor`

Lives at `backend/src/llm/agents/skill-editor/` (`run.ts`, `prompt.ts`), same
`run(ctx): AsyncIterable<StreamChunk>` signature as the other agents.

**Receives:** the current `raw_md`, the last ~6 messages, the user's message, and
any attached promos with their verdicts.

**Rules in its prompt:**

- Output the **complete revised `.md`**, not a diff and not a fragment. The
  content panel replaces its contents with what streams in; a partial answer
  would silently truncate the file.
- **Preserve the YAML frontmatter.** If it rewrites `name`, `slug` or `category`,
  the next Save creates a new lineage instead of a new version — the slug is what
  ties versions together. The prompt states this; `publish` validates it (below).
- When promos are attached: say what the winners share, what the losers share,
  and which differences are **probably coincidence**. With single-digit samples
  it may never claim certainty, and *"not enough evidence yet"* is a valid answer.
- **Flag confounds.** If all the winners came from one show or one campaign, the
  promo text probably isn't the cause — say so rather than writing a rule.
- **Propose a removal alongside each addition.** Every revision adds rules; after
  five rounds the file is a pile of narrow "don't repeat that one failure"
  instructions and output quality drops. Flag when the file passes ~800 words.

### Save as new version

`POST /skill-files/:slug/publish` with the content panel's current text and a
required `changelog`.

- It re-parses the markdown with `gray-matter` and **rejects the save if `slug`
  changed**, with a clear error. Frontmatter edits are otherwise allowed and
  re-derive `name`, `category`, `default_duration_sec`, `model`, `temperature`.
- It inserts one new `skill_files` row. The existing trigger assigns the version
  and retires the previous one. This path never `UPDATE`s an existing row — the
  in-place path below is the only one that does.
- It also writes the `.md` to Storage at `skill-files/{slug}/v{version}.md`.
- **No autosave.** Every save here is a version; autosaving would produce v14 by
  lunch — which is exactly what the in-place *Save* is for.
- Chat never publishes on its own. Streaming into the content panel changes
  nothing in the database until a Save is clicked.

### Two ways to save

The content panel can load **any** version, not only the active one, and offers
two saves:

| | **Save vN** | **Save as new version** |
|---|---|---|
| Writes | `UPDATE` the loaded row | `INSERT` one new row |
| Changelog | optional | required |
| Who may | the uploader, or an admin | any creator |
| Use for | a typo, a wording fix — anything a version of its own would just be noise | any change whose effect you want to measure |

**The cost of in-place edit, stated plainly.** `promos.skill_file_version`
snapshots which version produced each promo. After an in-place edit, promos
labelled with that version point at text that is no longer what produced them,
so the per-version win rate in phase B is approximate for any version that was
edited. This is an accepted trade, not an oversight — it buys a fast fix path
that does not litter the history with v7, v8, v9 for three typos. When the
comparison matters, use *Save as new version*.

In-place edit never touches `slug`, `version` or `is_active`: those identify the
row, and changing them there would be a different operation wearing this one's
name. The slug check from publish applies identically.

### Every version stays usable

There is **no rollback**, and no way to make an older version active again. A
revision that turns out worse is not undone — it is simply not used. The `@`
picker in the episode chat carries a version dropdown, so any version of a slug,
retired or not, can be tagged when generating a promo; the `promos` trigger
snapshots whichever one was used into `skill_file_version`.

That is what keeps the v1-vs-v2 comparison in phase B honest: both versions go
on being used and go on accumulating results, rather than one of them being
rewound out of existence.

### Clear chat

Archives the conversation (`archived = true`) and starts a fresh one on the next
turn. `messages` is append-only, so nothing is erased — the transcript stays
available to admins. Say "Clear chat" in the UI, not "Delete".

### Two things to decide before building

- **The mockup has two Save buttons** — one in the page header, one on the content
  panel. Pick one. Two save affordances for one action will cause accidental
  versions. My recommendation: keep the content panel's Save, drop the header's.
- **There is no changelog input in the mockup.** Save must prompt for one line.
  Six months later, "why does v3 say this?" has to be answerable from the row.

### Where code goes

- `shared/src/types/skill-chat.ts` — `AttachedPromo`, `SkillChatRequest`, `PublishRequest`
- `shared/src/validation/skill-chat.ts` — Zod schemas for both
- `backend/src/services/skill-chat.service.ts` — load conversation → route → run
  `skill-editor` → stream → persist messages. **Never writes `skill_files`.**
- `backend/src/services/skill-file.service.ts` — gains `publishVersion` and
  `updateVersionInPlace`, the only paths besides upload that write `skill_files`.
- `backend/src/controllers/skill-file.controller.ts` — the seven routes
- `frontend/src/features/skill-files/` — `SkillFileChat.tsx`, `SkillFileContent.tsx`,
  `AttachPromosModal.tsx`, `SaveVersionModal.tsx` (changelog), reuse the existing SSE hook

### What this is expected to achieve

Realistic: a skill file's hit rate moving from roughly a third to half or better
over three or four reviewed revisions, with the version table showing whether each
revision actually helped.

Not realistic, and do not build UI that implies it: a skill file where every promo
wins. Ad performance depends on the episode, the show's audience, the visuals, the
spend and the platform. Promo text is one input among several.