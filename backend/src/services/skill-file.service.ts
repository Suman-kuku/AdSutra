import matter from 'gray-matter';
import type {
  Json,
  PublishRequest,
  UpdateVersionRequest,
  SkillFileDTO,
  SkillFileDetailDTO,
  SkillFilePromoDTO,
  SkillFileSummaryDTO,
  SkillFileVersionDTO,
  Tables,
  UploadSkillFileInput,
} from '@scriptcraft/shared';
import { skillFileFrontmatterSchema, slugSchema } from '@scriptcraft/shared';
import { supabaseAdmin, type Db } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';

type SkillFileRow = Tables<'skill_files'>;

/** What `listPromosForSlug` selects: a promo plus the episode it ran on. */
export interface SkillFilePromoRow {
  id: string;
  version: number;
  content: string;
  created_at: string;
  skill_file_version: number | null;
  episode_id: string;
  episodes: { episode_number: number; title: string | null } | null;
}

export function toSkillFilePromoDTO(row: SkillFilePromoRow): SkillFilePromoDTO {
  return {
    id: row.id,
    version: row.version,
    skillFileVersion: row.skill_file_version,
    content: row.content,
    episodeId: row.episode_id,
    episodeNumber: row.episodes?.episode_number ?? null,
    episodeTitle: row.episodes?.title ?? null,
    createdAt: row.created_at,
  };
}

const SKILL_FILES_BUCKET = 'skill-files';

export function toSkillFileDTO(row: SkillFileRow): SkillFileDTO {
  return {
    id: row.id,
    slug: row.slug,
    version: row.version,
    name: row.name,
    category: row.category,
    description: row.description,
    language: row.language,
    tags: row.tags,
    defaultDurationSec: row.default_duration_sec,
    model: row.model,
    temperature: row.temperature,
    isActive: row.is_active,
    changelog: row.changelog,
    uploadedBy: row.uploaded_by,
    // Bytes, not characters: these files are frequently Devanagari, where one
    // character is three bytes and a character count would understate the size
    // by roughly a third.
    sizeBytes: Buffer.byteLength(row.raw_md, 'utf8'),
    createdAt: row.created_at,
  };
}

export function toSkillFileDetailDTO(row: SkillFileRow): SkillFileDetailDTO {
  return { ...toSkillFileDTO(row), promptBody: row.prompt_body, rawMd: row.raw_md };
}

/** `Emotional Promo.md` → `emotional-promo`. Used when frontmatter omits a slug. */
function slugFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface ParsedSkillFile {
  slug: string;
  promptBody: string;
  frontmatter: ReturnType<typeof skillFileFrontmatterSchema.parse>;
}

/** Splits the `.md` into YAML frontmatter and prompt body, and validates both. */
export function parseSkillFile(input: UploadSkillFileInput): ParsedSkillFile {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(input.content);
  } catch (err) {
    throw AppError.badRequest(
      `The YAML frontmatter could not be read: ${err instanceof Error ? err.message : 'unknown error'}`,
      'FRONTMATTER_UNPARSEABLE',
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    throw AppError.badRequest(
      'This file has no YAML frontmatter. It must start with a --- block containing at least `name` and `category`.',
      'FRONTMATTER_MISSING',
    );
  }

  const frontmatter = skillFileFrontmatterSchema.safeParse(parsed.data);
  if (!frontmatter.success) {
    const detail = frontmatter.error.issues
      .map((issue) => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`)
      .join('; ');
    throw AppError.badRequest(detail, 'FRONTMATTER_INVALID');
  }

  const promptBody = parsed.content.trim();
  if (promptBody.length === 0) {
    throw AppError.badRequest(
      'The file has frontmatter but no prompt body beneath it.',
      'PROMPT_BODY_EMPTY',
    );
  }

  const slugCandidate = frontmatter.data.slug ?? slugFromFilename(input.filename);
  const slug = slugSchema.safeParse(slugCandidate);
  if (!slug.success) {
    throw AppError.badRequest(
      `Could not derive a valid slug from "${input.filename}". Add a \`slug\` to the frontmatter.`,
      'SLUG_INVALID',
    );
  }

  return { slug: slug.data, promptBody, frontmatter: frontmatter.data };
}

/**
 * Writes one new `skill_files` row and its Storage object.
 *
 * Shared by both paths that produce a version — first upload and Save from the
 * skill file chat — because the ordering here is fiddly and must not drift
 * between them.
 *
 * The DB trigger assigns `version`, so the Storage key `{slug}/v{version}.md`
 * is only knowable after the insert. Hence insert → upload → patch the path,
 * with the row removed again if the upload fails so no version points at a
 * file that was never written.
 *
 * The two housekeeping updates go through `supabaseAdmin` rather than the
 * caller's client: `skill_files_update_owner_or_admin` only lets the original
 * uploader flip `is_active`, but CLAUDE.md section 3 says any creator may
 * publish a new version of any skill file. Without this, creator B publishing
 * over creator A's file would silently update zero rows and then collide with
 * the partial unique index.
 */
async function insertSkillFileVersion(
  db: Db,
  uploadedBy: string,
  params: { slug: string; rawMd: string; parsed: ParsedSkillFile; changelog: string | null },
): Promise<SkillFileRow> {
  const { slug, rawMd, parsed, changelog } = params;

  // `skill_files_one_active_per_slug` is a non-deferrable partial unique index,
  // so it rejects a second active row the moment it is inserted — before the
  // `skill_files_deactivate_prior` AFTER INSERT trigger can stand the old one
  // down. The previous version therefore has to be retired first.
  const { data: previouslyActive } = await db
    .from('skill_files')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  const { error: deactivateError } = await supabaseAdmin
    .from('skill_files')
    .update({ is_active: false })
    .eq('slug', slug)
    .eq('is_active', true);

  if (deactivateError) {
    throw new AppError(
      500,
      'SKILL_FILE_DEACTIVATE_FAILED',
      'Could not retire the previous version of this skill file.',
      { cause: deactivateError },
    );
  }

  const { data: inserted, error: insertError } = await db
    .from('skill_files')
    .insert({
      slug,
      name: parsed.frontmatter.name,
      category: parsed.frontmatter.category,
      description: parsed.frontmatter.description ?? null,
      language: parsed.frontmatter.language ?? null,
      tags: parsed.frontmatter.tags ?? [],
      default_duration_sec: parsed.frontmatter.default_duration_sec ?? null,
      model: parsed.frontmatter.model ?? null,
      temperature: parsed.frontmatter.temperature ?? null,
      changelog,
      frontmatter: parsed.frontmatter as unknown as Json,
      prompt_body: parsed.promptBody,
      raw_md: rawMd,
      // Rewritten below once the trigger has told us the version.
      storage_path: `${slug}/pending.md`,
      uploaded_by: uploadedBy,
      is_active: true,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    throw new AppError(500, 'SKILL_FILE_CREATE_FAILED', 'Could not save the skill file.', {
      cause: insertError,
    });
  }

  const storagePath = `${slug}/v${inserted.version}.md`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(SKILL_FILES_BUCKET)
    .upload(storagePath, rawMd, { contentType: 'text/markdown', upsert: true });

  if (uploadError) {
    // Roll back to the state before this write: drop the new row and put the
    // previous version back in charge, so the slug is never left with none.
    await db.from('skill_files').delete().eq('id', inserted.id);
    if (previouslyActive) {
      await supabaseAdmin.from('skill_files').update({ is_active: true }).eq('id', previouslyActive.id);
    }
    throw new AppError(500, 'SKILL_FILE_UPLOAD_FAILED', 'Could not store the skill file.', {
      cause: uploadError,
    });
  }

  const { data: updated, error: updateError } = await db
    .from('skill_files')
    .update({ storage_path: storagePath })
    .eq('id', inserted.id)
    .select('*')
    .single();

  if (updateError || !updated) {
    throw new AppError(500, 'SKILL_FILE_CREATE_FAILED', 'Could not finalise the skill file.', {
      cause: updateError,
    });
  }

  return updated;
}

/** Stores a new version of a skill file, uploaded as a `.md` through the library UI. */
export async function uploadSkillFile(
  db: Db,
  uploadedBy: string,
  input: UploadSkillFileInput,
): Promise<SkillFileRow> {
  console.log(`[skill-file] upload received filename=${input.filename} uploadedBy=${uploadedBy}`);
  const parsed = parseSkillFile(input);
  console.log(
    `[skill-file] parsed slug=${parsed.slug} name=${parsed.frontmatter.name} category=${parsed.frontmatter.category}`,
  );

  const updated = await insertSkillFileVersion(db, uploadedBy, {
    slug: parsed.slug,
    rawMd: input.content,
    parsed,
    changelog: parsed.frontmatter.changelog ?? null,
  });

  console.log(`[skill-file] uploaded slug=${updated.slug} version=${updated.version} id=${updated.id}`);
  return updated;
}

/**
 * The library.
 *
 * `includeAllVersions` is what the episode chat's `@` picker uses: a promo can
 * be generated from *any* version, not only the current one, and the version
 * that produced last month's winner is often a retired one. Ordered by slug
 * then version descending there, so a file's versions stay together with the
 * newest first.
 */
export async function listSkillFiles(
  db: Db,
  category?: string,
  includeAllVersions = false,
): Promise<SkillFileRow[]> {
  let query = db.from('skill_files').select('*');
  if (!includeAllVersions) query = query.eq('is_active', true);
  if (category) query = query.eq('category', category);

  const { data, error } = includeAllVersions
    ? await query.order('slug').order('version', { ascending: false })
    : await query.order('category').order('name');

  if (error) {
    throw new AppError(500, 'SKILL_FILES_READ_FAILED', 'Could not load skill files.', {
      cause: error,
    });
  }
  return data;
}

/** Looked up by id rather than slug — how the chat composer's @mention picker refers to one. */
export async function getSkillFileById(db: Db, id: string): Promise<SkillFileRow> {
  const { data, error } = await db.from('skill_files').select('*').eq('id', id).maybeSingle();

  if (error) {
    throw new AppError(500, 'SKILL_FILE_READ_FAILED', 'Could not load the skill file.', {
      cause: error,
    });
  }
  if (!data) {
    throw AppError.notFound('Skill file not found.', 'SKILL_FILE_NOT_FOUND');
  }
  return data;
}

export async function getActiveSkillFile(db: Db, slug: string): Promise<SkillFileRow> {
  const { data, error } = await db
    .from('skill_files')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'SKILL_FILE_READ_FAILED', 'Could not load this skill file.', {
      cause: error,
    });
  }
  if (!data) {
    throw AppError.notFound('Skill file not found.', 'SKILL_FILE_NOT_FOUND');
  }
  return data;
}

/** Every version of a slug, newest first. */
export async function listSkillFileVersions(db: Db, slug: string): Promise<SkillFileRow[]> {
  const { data, error } = await db
    .from('skill_files')
    .select('*')
    .eq('slug', slug)
    .order('version', { ascending: false });

  if (error) {
    throw new AppError(500, 'SKILL_FILE_VERSIONS_FAILED', 'Could not load version history.', {
      cause: error,
    });
  }
  if (data.length === 0) {
    throw AppError.notFound('Skill file not found.', 'SKILL_FILE_NOT_FOUND');
  }
  return data;
}

/**
 * Save — commits the content panel's text as the next version.
 *
 * This is the only path that writes `skill_files` for the skill file chat; the
 * chat agent itself never does. There is no in-place update path: every Save is
 * one new row, and the trigger retires the last one. There is no rollback
 * either — an older version is re-used by tagging it in the episode chat, never
 * by being made active again.
 *
 * The slug check is the important one. `slug` is what ties versions together,
 * so a revision that renamed it would quietly start a second lineage — v1 of a
 * new file rather than v4 of this one — and the version history, the stats and
 * the leaderboard would all split in two without any error being raised.
 */
export async function publishVersion(
  db: Db,
  uploadedBy: string,
  slug: string,
  input: PublishRequest,
): Promise<SkillFileRow> {
  console.log(`[skill-file] publish requested slug=${slug} by=${uploadedBy}`);

  await getActiveSkillFile(db, slug); // 404s if the slug does not exist

  // Reuses the upload path's parser, so a hand-edited file is held to exactly
  // the same frontmatter rules as an uploaded one.
  const parsed = parseSkillFile({ filename: `${slug}.md`, content: input.content });

  if (parsed.slug !== slug) {
    throw AppError.badRequest(
      `This skill file's slug is "${slug}", but the edited frontmatter says "${parsed.slug}". ` +
        'Changing the slug would start a separate skill file instead of a new version — ' +
        'put it back, or upload the edited file as a new skill file.',
      'SLUG_CHANGED',
    );
  }

  const published = await insertSkillFileVersion(db, uploadedBy, {
    slug,
    rawMd: input.content,
    parsed,
    changelog: input.changelog,
  });

  console.log(`[skill-file] published slug=${slug} version=${published.version} id=${published.id}`);
  return published;
}

/** One specific version of a slug, active or retired. */
export async function getSkillFileVersion(
  db: Db,
  slug: string,
  version: number,
): Promise<SkillFileRow> {
  const { data, error } = await db
    .from('skill_files')
    .select('*')
    .eq('slug', slug)
    .eq('version', version)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'SKILL_FILE_READ_FAILED', 'Could not load that version.', {
      cause: error,
    });
  }
  if (!data) {
    throw AppError.notFound(
      `Version ${version} of this skill file does not exist.`,
      'SKILL_FILE_VERSION_NOT_FOUND',
    );
  }
  return data;
}

/**
 * Edits one version in place — the second save path, alongside `publishVersion`.
 *
 * This is the one operation that rewrites history rather than appending to it,
 * so two things are worth stating plainly:
 *
 * 1. `promos.skill_file_version` snapshots which version produced each promo.
 *    After an in-place edit, promos labelled with this version point at text
 *    that is no longer what produced them, and the per-version win rate in
 *    section 12's phase B is correspondingly approximate. That is an accepted
 *    trade, not an oversight — use "Save as new version" when the comparison
 *    matters.
 * 2. Ownership is enforced by `skill_files_update_owner_or_admin`, so this runs
 *    on the caller's client, not the admin one. Editing someone else's file
 *    updates nothing, which is reported as a 403 rather than passing silently.
 *
 * `slug`, `version` and `is_active` are never touched: those are what identify
 * the row, and changing them here would be a different operation wearing this
 * one's name.
 */
export async function updateVersionInPlace(
  db: Db,
  slug: string,
  version: number,
  input: UpdateVersionRequest,
): Promise<SkillFileRow> {
  console.log(`[skill-file] in-place edit requested slug=${slug} v${version}`);

  const target = await getSkillFileVersion(db, slug, version);
  const parsed = parseSkillFile({ filename: `${slug}.md`, content: input.content });

  if (parsed.slug !== slug) {
    throw AppError.badRequest(
      `This skill file's slug is "${slug}", but the edited frontmatter says "${parsed.slug}". ` +
        'Changing the slug would point this row at a different skill file — put it back, ' +
        'or upload the edited file as a new skill file.',
      'SLUG_CHANGED',
    );
  }

  const fields = {
    name: parsed.frontmatter.name,
    category: parsed.frontmatter.category,
    description: parsed.frontmatter.description ?? null,
    language: parsed.frontmatter.language ?? null,
    tags: parsed.frontmatter.tags ?? [],
    default_duration_sec: parsed.frontmatter.default_duration_sec ?? null,
    model: parsed.frontmatter.model ?? null,
    temperature: parsed.frontmatter.temperature ?? null,
    changelog: input.changelog ?? target.changelog,
    frontmatter: parsed.frontmatter as unknown as Json,
    prompt_body: parsed.promptBody,
    raw_md: input.content,
  };

  const { data: updated, error: updateError } = await db
    .from('skill_files')
    .update(fields)
    .eq('id', target.id)
    .select('*')
    .maybeSingle();

  if (updateError) {
    throw new AppError(500, 'SKILL_FILE_UPDATE_FAILED', 'Could not save this version.', {
      cause: updateError,
    });
  }

  // RLS filtered the row out rather than raising: the caller is neither the
  // uploader nor an admin.
  if (!updated) {
    throw AppError.forbidden(
      'Only the person who uploaded this skill file (or an admin) can edit a version in place. ' +
        'Use "Save as new version" instead.',
      'NOT_YOUR_SKILL_FILE',
    );
  }

  const storagePath = target.storage_path;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(SKILL_FILES_BUCKET)
    .upload(storagePath, input.content, { contentType: 'text/markdown', upsert: true });

  if (uploadError) {
    // Put the row back, so the DB and the stored `.md` never disagree about
    // what this version says.
    await db
      .from('skill_files')
      .update({
        name: target.name,
        category: target.category,
        description: target.description,
        language: target.language,
        tags: target.tags,
        default_duration_sec: target.default_duration_sec,
        model: target.model,
        temperature: target.temperature,
        changelog: target.changelog,
        frontmatter: target.frontmatter,
        prompt_body: target.prompt_body,
        raw_md: target.raw_md,
      })
      .eq('id', target.id);

    throw new AppError(500, 'SKILL_FILE_UPLOAD_FAILED', 'Could not store the edited skill file.', {
      cause: uploadError,
    });
  }

  console.log(`[skill-file] edited in place slug=${slug} v${version} id=${updated.id}`);
  return updated;
}

/**
 * Promos made from this skill file, newest first — the attach picker's list.
 *
 * Matched on the denormalised `promos.skill_file_slug` rather than
 * `skill_file_id`, so promos made from *any* version of the file are found,
 * not just the active one. RLS scopes the result to the caller's own promos.
 */
export async function listPromosForSlug(db: Db, slug: string): Promise<SkillFilePromoRow[]> {
  const { data, error } = await db
    .from('promos')
    .select(
      'id, version, content, created_at, skill_file_version, episode_id, episodes(episode_number, title)',
    )
    .eq('skill_file_slug', slug)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'SKILL_FILE_PROMOS_FAILED', 'Could not load promos for this skill file.', {
      cause: error,
    });
  }
  return data;
}

/** `${slug}@${version}` — how a version is keyed in the use-count maps. */
function useKey(slug: string, version: number): string {
  return `${slug}@${version}`;
}

interface UseCounts {
  /** Promos made from any version of a slug. */
  bySlug: Map<string, number>;
  /** Promos made from one exact version, keyed by `useKey`. */
  byVersion: Map<string, number>;
}

/**
 * How many promos each skill file version has produced.
 *
 * Counted through `supabaseAdmin` on purpose. Under RLS a creator only sees
 * their own promos, so a caller-scoped count would render as "12 uses" on a
 * page that calls itself a shared library and mean "12 uses by me" — the one
 * number on this screen that has to be library-wide to mean anything.
 *
 * Reads two denormalised columns rather than aggregating server-side: the
 * snapshot on `promos` is what survives a skill file being superseded, and at
 * this table's size a grouped count in JS is cheaper than a new DB function.
 * If `promos` ever grows past tens of thousands of rows this wants to become a
 * view or an RPC.
 */
async function countSkillFileUses(): Promise<UseCounts> {
  const { data, error } = await supabaseAdmin
    .from('promos')
    .select('skill_file_slug, skill_file_version');

  if (error) {
    throw new AppError(500, 'SKILL_FILE_USES_FAILED', 'Could not count skill file usage.', {
      cause: error,
    });
  }

  const bySlug = new Map<string, number>();
  const byVersion = new Map<string, number>();

  for (const promo of data) {
    const slug = promo.skill_file_slug;
    if (!slug) continue; // Pre-snapshot rows, if any — nothing to attribute them to.

    bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1);
    if (promo.skill_file_version !== null) {
      const key = useKey(slug, promo.skill_file_version);
      byVersion.set(key, (byVersion.get(key) ?? 0) + 1);
    }
  }

  return { bySlug, byVersion };
}

/** How many versions each slug has, retired ones included. */
async function countVersionsBySlug(db: Db): Promise<Map<string, number>> {
  const { data, error } = await db.from('skill_files').select('slug');

  if (error) {
    throw new AppError(500, 'SKILL_FILES_READ_FAILED', 'Could not count skill file versions.', {
      cause: error,
    });
  }

  const counts = new Map<string, number>();
  for (const row of data) counts.set(row.slug, (counts.get(row.slug) ?? 0) + 1);
  return counts;
}

/**
 * The library list: the active version of each slug, plus how many versions it
 * has and how many promos it has produced in total.
 *
 * `versionCount` and `totalUses` are slug-level numbers, so they read the same
 * on every row of a slug when `includeAllVersions` is on — that is deliberate,
 * not a leak of the active row's figures onto retired ones.
 */
export async function listSkillFileSummaries(
  db: Db,
  category?: string,
  includeAllVersions = false,
): Promise<SkillFileSummaryDTO[]> {
  const [rows, versionCounts, uses] = await Promise.all([
    listSkillFiles(db, category, includeAllVersions),
    countVersionsBySlug(db),
    countSkillFileUses(),
  ]);

  return rows.map((row) => ({
    ...toSkillFileDTO(row),
    versionCount: versionCounts.get(row.slug) ?? 1,
    totalUses: uses.bySlug.get(row.slug) ?? 0,
  }));
}

/** Every version of a slug, newest first, each with the promos it produced. */
export async function listSkillFileVersionsWithUses(
  db: Db,
  slug: string,
): Promise<SkillFileVersionDTO[]> {
  const [rows, uses] = await Promise.all([listSkillFileVersions(db, slug), countSkillFileUses()]);

  return rows.map((row) => ({
    ...toSkillFileDTO(row),
    uses: uses.byVersion.get(useKey(row.slug, row.version)) ?? 0,
  }));
}
