import type {
  ConversationDTO,
  CreateConversationInput,
  MessageDTO,
  Tables,
} from '@scriptcraft/shared';
import type { Db } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { getEpisodeById } from './episode.service.js';

type ConversationRow = Tables<'conversations'>;
type MessageRow = Tables<'messages'>;

export function toConversationDTO(row: ConversationRow): ConversationDTO {
  return {
    id: row.id,
    kind: row.kind,
    episodeId: row.episode_id,
    skillFileSlug: row.skill_file_slug,
    createdBy: row.created_by,
    title: row.title,
    activeSkillFileId: row.active_skill_file_id,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
    archived: row.archived,
    createdAt: row.created_at,
  };
}

export function toMessageDTO(row: MessageRow): MessageDTO {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    skillFileId: row.skill_file_id,
    promoId: row.promo_id,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    latencyMs: row.latency_ms,
    error: row.error,
    createdAt: row.created_at,
  };
}

export async function listConversationsForEpisode(
  db: Db,
  episodeId: string,
): Promise<ConversationRow[]> {
  await getEpisodeById(db, episodeId); // RLS-scoped; 404s if not the caller's

  const { data, error } = await db
    .from('conversations')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'CONVERSATIONS_READ_FAILED', 'Could not load conversations.', {
      cause: error,
    });
  }
  return data;
}

export async function getConversationById(db: Db, id: string): Promise<ConversationRow> {
  const { data, error } = await db.from('conversations').select('*').eq('id', id).maybeSingle();

  if (error) {
    throw new AppError(500, 'CONVERSATION_READ_FAILED', 'Could not load this conversation.', {
      cause: error,
    });
  }
  if (!data) {
    throw AppError.notFound('Conversation not found.', 'CONVERSATION_NOT_FOUND');
  }
  return data;
}

export async function createConversation(
  db: Db,
  createdBy: string,
  input: CreateConversationInput,
): Promise<ConversationRow> {
  const episode = await getEpisodeById(db, input.episodeId);

  if (episode.status !== 'ready') {
    throw AppError.conflict(
      'This episode’s script has not been parsed yet.',
      'SCRIPT_NOT_READY',
    );
  }

  const { data, error } = await db
    .from('conversations')
    .insert({
      kind: 'episode',
      episode_id: input.episodeId,
      created_by: createdBy,
      title: input.title ?? null,
      active_skill_file_id: input.skillFileId ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'CONVERSATION_CREATE_FAILED', 'Could not start a conversation.', {
      cause: error,
    });
  }
  return data;
}

/**
 * "Delete this conversation's history" — nothing is actually erased.
 * `messages` has no update/delete policy at all (see CLAUDE.md §6), so this
 * flips the existing `archived` flag on `conversations` instead: the thread
 * drops out of `listConversationsForEpisode`'s view, admins can still read it
 * in full, and any `promos` rows already saved from it are untouched — they
 * don't reference `archived` at all.
 */
export async function archiveConversation(db: Db, id: string): Promise<ConversationRow> {
  await getConversationById(db, id); // 404s if not found or not the caller's

  const { data, error } = await db
    .from('conversations')
    .update({ archived: true })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'CONVERSATION_ARCHIVE_FAILED', 'Could not delete this conversation history.', {
      cause: error,
    });
  }
  console.log(`[conversation] archived id=${id}`);
  return data;
}

/** The transcript, oldest first. `messages` has no update or delete policy. */
export async function listMessages(db: Db, conversationId: string): Promise<MessageRow[]> {
  await getConversationById(db, conversationId);

  const { data, error } = await db
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(500, 'MESSAGES_READ_FAILED', 'Could not load the transcript.', {
      cause: error,
    });
  }
  return data;
}

/**
 * The unsaved promo draft currently in play, if any — the most recent
 * assistant turn that produced promo copy rather than a QA answer or a
 * failure. Nothing in the schema marks a message as "this is a promo draft"
 * directly, but `skill_file_id` already does the job: `qa-responder` never
 * sets it, and a failed turn's row carries `error` instead of real content.
 */
export async function getLatestDraftMessage(db: Db, conversationId: string): Promise<MessageRow | null> {
  const { data, error } = await db
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('role', 'assistant')
    .not('skill_file_id', 'is', null)
    .is('error', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DRAFT_READ_FAILED', 'Could not load the current draft.', {
      cause: error,
    });
  }
  return data;
}
