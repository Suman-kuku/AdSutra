import type { Tables } from '@scriptcraft/shared';
import { supabaseAdmin, type Db } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { getConversationById, getLatestDraftMessage } from './conversation.service.js';
import { getEpisodeById } from './episode.service.js';
import { getSkillFileById } from './skill-file.service.js';

type PromoRow = Tables<'promos'>;

/**
 * Inserts a promo version.
 *
 * `version`, `root_promo_id`, `word_count` and the skill-file snapshot are all
 * derived by the `promos_set_lineage` trigger — only `content` and
 * `parent_promo_id` are ours to set. Refining never updates a row; it inserts
 * a child.
 */
export async function createPromo(
  db: Db,
  input: {
    episodeId: string;
    conversationId: string;
    skillFileId: string;
    content: string;
    createdBy: string;
    source: 'generated' | 'refined' | 'human_edited';
    parentPromoId?: string | null;
    durationSec?: number | null;
    humanEditRatio?: number | null;
  },
): Promise<PromoRow> {
  const { data, error } = await db
    .from('promos')
    .insert({
      episode_id: input.episodeId,
      conversation_id: input.conversationId,
      skill_file_id: input.skillFileId,
      content: input.content,
      created_by: input.createdBy,
      source: input.source,
      parent_promo_id: input.parentPromoId ?? null,
      duration_sec: input.durationSec ?? null,
      human_edit_ratio: input.humanEditRatio ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'PROMO_CREATE_FAILED', 'Could not save the promo.', { cause: error });
  }
  return data;
}

/** The most recently *saved* promo in this thread, or null before any Save has happened. */
export async function getLatestPromoOrNull(db: Db, conversationId: string): Promise<PromoRow | null> {
  const { data, error } = await db
    .from('promos')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'PROMO_READ_FAILED', 'Could not load the current promo.', {
      cause: error,
    });
  }
  return data;
}

/**
 * Whether a successful CREATE turn has happened since `since`.
 *
 * This is what separates "a second promo in this thread" from "another version
 * of the one already saved". Errored turns are excluded: a CREATE that failed
 * produced no draft, so it did not start a new lineage.
 */
export async function hasCreateTurnSince(
  db: Db,
  conversationId: string,
  since: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('role', 'assistant')
    .eq('intent', 'CREATE')
    .is('error', null)
    .gt('created_at', since)
    .limit(1);

  if (error) {
    throw new AppError(500, 'PROMO_LINEAGE_READ_FAILED', 'Could not save the promo.', {
      cause: error,
    });
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Commits the chat's current draft as a new `promos` row. Chat turns
 * themselves never write to `promos` (see `chat.service.ts`) — this is the
 * only path that does, and it only runs when the user clicks Save.
 *
 * One conversation can hold several promos. A draft that came from a CREATE
 * turn after the last Save is a *new* promo and starts its own lineage with a
 * null parent; anything else is a refinement of what was last saved and is
 * chained to it, letting the trigger derive the next version.
 *
 * `messages` is append-only, so there is no way to stamp the triggering
 * message with the resulting `promo_id` after the fact; the link back to the
 * conversation is `promos.conversation_id`.
 */
export async function saveLatestDraftAsPromo(
  db: Db,
  userId: string,
  conversationId: string,
): Promise<PromoRow> {
  console.log(`[promo] save requested convo=${conversationId} user=${userId}`);

  const conversation = await getConversationById(db, conversationId);

  // Promos belong to an episode. A skill file chat has none, and its turns are
  // revised prompt files rather than promo copy — Save there publishes a skill
  // file version instead (`skill-file.service.ts#publishVersion`).
  if (conversation.kind !== 'episode' || !conversation.episode_id) {
    throw AppError.badRequest(
      'This conversation is not an episode chat.',
      'NOT_EPISODE_CONVERSATION',
    );
  }

  const draft = await getLatestDraftMessage(db, conversationId);

  if (!draft || !draft.skill_file_id) {
    console.log(`[promo] ✗ nothing to save convo=${conversationId}`);
    throw AppError.conflict('There is no unsaved promo to save yet.', 'NO_DRAFT_TO_SAVE');
  }

  const [skillFile, previous] = await Promise.all([
    getSkillFileById(db, draft.skill_file_id),
    getLatestPromoOrNull(db, conversationId),
  ]);

  const parent =
    previous && !(await hasCreateTurnSince(db, conversationId, previous.created_at))
      ? previous
      : null;

  console.log(
    `[promo] saving draft chars=${draft.content.length} skillFile=${skillFile.slug} v${skillFile.version} parent=${
      parent ? parent.id : 'none (new promo)'
    }`,
  );

  const promo = await createPromo(db, {
    episodeId: conversation.episode_id,
    conversationId,
    skillFileId: skillFile.id,
    content: draft.content,
    createdBy: userId,
    source: parent ? 'refined' : 'generated',
    parentPromoId: parent?.id ?? null,
    durationSec: skillFile.default_duration_sec,
  });

  console.log(`[promo] saved id=${promo.id} version=${promo.version} rootPromoId=${promo.root_promo_id ?? promo.id}`);
  return promo;
}

/**
 * Every promo row saved against this episode, oldest first — all versions, not
 * just the newest of each.
 *
 * Scoped to the episode rather than one conversation on purpose: archiving a
 * thread ("delete history") must not take its saved promos out of view, and
 * `promos` rows carry no `archived` flag of their own.
 *
 * A single thread can hold several distinct promos (a CREATE turn after a Save
 * starts a new one), and each accumulates a version per Save. The caller groups
 * these by `root_promo_id`; keeping the list flat means switching versions
 * costs no extra request.
 */
export async function listSavedPromosForEpisode(db: Db, episodeId: string): Promise<PromoRow[]> {
  await getEpisodeById(db, episodeId); // RLS-scoped; 404s if not the caller's

  const { data, error } = await db
    .from('promos')
    .select('*')
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(500, 'PROMOS_READ_FAILED', 'Could not load saved promos.', { cause: error });
  }
  return data;
}

/** Every version sharing a root, oldest first. */
export async function listPromoVersions(db: Db, rootPromoId: string): Promise<PromoRow[]> {
  const { data, error } = await db
    .from('promos')
    .select('*')
    .eq('root_promo_id', rootPromoId)
    .order('version', { ascending: true });

  if (error) {
    throw new AppError(500, 'PROMO_VERSIONS_FAILED', 'Could not load promo versions.', {
      cause: error,
    });
  }
  return data;
}

/** One promo version, RLS-scoped — 404s if it is not the caller's. */
export async function getPromoById(db: Db, promoId: string): Promise<PromoRow> {
  const { data, error } = await db.from('promos').select('*').eq('id', promoId).maybeSingle();

  if (error) {
    throw new AppError(500, 'PROMO_READ_FAILED', 'Could not load this promo.', { cause: error });
  }
  if (!data) throw AppError.notFound('Promo not found.', 'PROMO_NOT_FOUND');
  return data;
}

/**
 * Permanently deletes one promo version. There is no undo and no archive flag
 * on `promos` — unlike conversation history, this really is erased.
 *
 * Later versions survive: `promos.parent_promo_id` is `on delete set null`, so
 * deleting v1 leaves v2 in place, merely orphaned. Their `root_promo_id` is a
 * plain column with no foreign key, so the whole lineage stays grouped in the
 * UI even when the row that named it is gone. Version numbers are assigned on
 * insert and never recomputed, so a deleted version leaves a visible gap —
 * v2, v3 with no v1. That is honest: the version that produced them existed.
 *
 * `promo_performance` is `on delete cascade`, so a promo's market results go
 * with it. Nothing reports performance yet (build step 10), but that is the
 * row this operation destroys silently once it does.
 */
export async function deletePromo(db: Db, promoId: string): Promise<void> {
  const promo = await getPromoById(db, promoId); // 404s if not found or not the caller's
  console.log(`[promo] delete requested id=${promoId} version=${promo.version}`);

  const { error } = await db.from('promos').delete().eq('id', promoId);

  if (error) {
    throw new AppError(500, 'PROMO_DELETE_FAILED', 'Could not delete this promo version.', {
      cause: error,
    });
  }
  console.log(`[promo] deleted id=${promoId} — performance reports cascaded`);

  // `skill_file_stats` counts promos per skill file, so it is stale the moment
  // one disappears. Run through the admin client: `refresh_skill_file_stats`
  // is deliberately not granted to `authenticated` (see the RLS migration).
  // Non-fatal — the delete already succeeded, and the next refresh corrects it.
  const { error: statsError } = await supabaseAdmin.rpc('refresh_skill_file_stats');
  if (statsError) {
    console.error('[promo] could not refresh skill file stats after delete', statsError);
  }
}
