import type {
  Intent,
  MessageDTO,
  RouteDecision,
  SkillAgentContext,
  SkillChatRequest,
  SkillChatStateDTO,
  Tables,
} from '@scriptcraft/shared';
import type { Db } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { classifyIntent } from '../llm/agents/intent-classifier/classify.js';
import { renderAttachedPromos } from '../llm/agents/skill-editor/prompt.js';
import { run as runSkillEditor } from '../llm/agents/skill-editor/run.js';
import { getActiveSkillFile, getSkillFileVersion } from './skill-file.service.js';
import { toConversationDTO, toMessageDTO } from './conversation.service.js';

type ConversationRow = Tables<'conversations'>;
type MessageRow = Tables<'messages'>;

/** Only two intents exist in this chat — CREATE has no meaning here. */
type SkillIntent = Extract<Intent, 'EDIT' | 'QUESTION'>;

/**
 * Below this the classifier's pick is treated as unreliable and we fall back
 * to QUESTION — the opposite bias to the episode chat, and for the same
 * "prefer the cheap mistake" reason. There, a wrong CREATE destroys a draft.
 * Here, a wrong EDIT overwrites whatever the user had typed into the content
 * panel, while a wrong QUESTION only costs them a prose answer they didn't ask
 * for. Nothing is published either way.
 */
const CONFIDENCE_THRESHOLD = 0.5;

export interface SkillChatHandlers {
  onIntent: (decision: RouteDecision) => void;
  onToken: (text: string) => void;
  onUsage: (usage: {
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
    latencyMs: number;
  }) => void;
}

/** The caller's open (non-archived) thread on this skill file, if any. */
async function findOpenConversation(
  db: Db,
  userId: string,
  slug: string,
): Promise<ConversationRow | null> {
  const { data, error } = await db
    .from('conversations')
    .select('*')
    .eq('kind', 'skill_file')
    .eq('skill_file_slug', slug)
    .eq('created_by', userId)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'CONVERSATION_READ_FAILED', 'Could not load this chat.', {
      cause: error,
    });
  }
  return data;
}

/**
 * Lazily, like the episode chat: opening the page must not create a row, or
 * every browse leaves an empty thread behind. The first turn creates it.
 *
 * One open thread per person per skill file. The file is a shared library, but
 * the conversation is not — `conversations_select` scopes reads to the creator
 * (admins excepted), so two people working on the same file get their own.
 */
async function createSkillConversation(
  db: Db,
  userId: string,
  skillFile: Tables<'skill_files'>,
): Promise<ConversationRow> {
  const { data, error } = await db
    .from('conversations')
    .insert({
      kind: 'skill_file',
      skill_file_slug: skillFile.slug,
      episode_id: null,
      created_by: userId,
      title: skillFile.name,
      active_skill_file_id: skillFile.id,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'CONVERSATION_CREATE_FAILED', 'Could not start this chat.', {
      cause: error,
    });
  }
  console.log(`[skill-chat] conversation created slug=${skillFile.slug} id=${data.id}`);
  return data;
}

async function listMessagesFor(db: Db, conversationId: string): Promise<MessageRow[]> {
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

/** GET /skill-files/:slug/chat — the open thread and its transcript, or nothing yet. */
export async function getSkillChatState(
  db: Db,
  userId: string,
  slug: string,
): Promise<SkillChatStateDTO> {
  await getActiveSkillFile(db, slug); // 404s if the slug does not exist

  const conversation = await findOpenConversation(db, userId, slug);
  if (!conversation) return { conversation: null, messages: [] };

  const messages = await listMessagesFor(db, conversation.id);
  const messageDTOs: MessageDTO[] = messages.map(toMessageDTO);
  return { conversation: toConversationDTO(conversation), messages: messageDTOs };
}

/**
 * "Clear chat" — archives the open thread. Nothing is erased: `messages` has
 * no delete policy at all, so the transcript stays readable by admins and the
 * next turn simply starts a fresh conversation. Say "Clear chat" in the UI,
 * never "Delete".
 */
export async function clearSkillChat(db: Db, userId: string, slug: string): Promise<void> {
  await getActiveSkillFile(db, slug);

  const conversation = await findOpenConversation(db, userId, slug);
  if (!conversation) return; // Nothing open — clearing an empty chat is a no-op, not an error.

  const { error } = await db
    .from('conversations')
    .update({ archived: true })
    .eq('id', conversation.id);

  if (error) {
    throw new AppError(500, 'CONVERSATION_ARCHIVE_FAILED', 'Could not clear this chat.', {
      cause: error,
    });
  }
  console.log(`[skill-chat] cleared slug=${slug} conversation=${conversation.id}`);
}

/**
 * Two intents, one deterministic short-circuit. Far simpler than the episode
 * chat's router: there is no script, no draft, and no forced intent, so this
 * lives here rather than in `llm/router/`.
 */
async function routeSkillTurn(
  message: string,
  attachedCount: number,
  skillFileName: string,
): Promise<RouteDecision & { intent: SkillIntent }> {
  // Attaching a batch of results is only ever a request to revise the file.
  if (attachedCount > 0) {
    return { intent: 'EDIT', source: 'precondition', reason: 'Promos attached to this turn.' };
  }

  const classification = await classifyIntent({
    message,
    allowedIntents: ['EDIT', 'QUESTION'],
    domain: 'skill_file',
    skillFileName,
  });

  const intent: SkillIntent =
    classification.confidence < CONFIDENCE_THRESHOLD
      ? 'QUESTION'
      : classification.intent === 'EDIT'
        ? 'EDIT'
        : 'QUESTION';

  return {
    intent,
    source: 'classifier',
    confidence: classification.confidence,
    reason: classification.reason,
  };
}

/**
 * One skill file chat turn: load state → route → run `skill-editor` → stream →
 * persist. Mirrors `chat.service.ts` deliberately, including writing the user
 * row before routing and writing an assistant row with `error` set on failure.
 *
 * **Never writes `skill_files`.** An EDIT turn's revised `.md` reaches the
 * database only when the user clicks Save, which goes to
 * `skill-file.service.ts#publishVersion`.
 */
export async function runSkillChatTurn(
  db: Db,
  userId: string,
  slug: string,
  input: SkillChatRequest,
  handlers: SkillChatHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const attachedPromos = input.attachedPromos ?? [];
  console.log(
    `\n[skill-chat] === turn start === slug=${slug} user=${userId} attached=${attachedPromos.length} version=${
      input.version ?? 'active'
    } model=${input.model ?? 'default'} message="${input.message}"`,
  );

  // Whichever version the editor has loaded — not simply the active one. A turn
  // asking about v2 has to be answered against v2.
  const skillFile =
    input.version === undefined
      ? await getActiveSkillFile(db, slug)
      : await getSkillFileVersion(db, slug, input.version);

  // What the user is actually looking at, unsaved edits included. Falls back to
  // the saved row when the client sent nothing (an older client, or a turn
  // started before the panel had loaded).
  const currentContent = input.content ?? skillFile.raw_md;

  const conversation =
    (await findOpenConversation(db, userId, slug)) ??
    (await createSkillConversation(db, userId, skillFile));

  // Read before this turn is written, so it is not echoed back to itself.
  const history = await listMessagesFor(db, conversation.id);

  // The attachment block is persisted, not just prompted: batches are meant to
  // accumulate across turns (CLAUDE.md section 12), and the next turn only
  // replays `messages`. If this lived solely in the prompt, batch 1 would be
  // invisible to batch 2 and the user would have to re-attach everything.
  const attachedBlock = renderAttachedPromos(attachedPromos);
  const userContent = attachedBlock ? `${attachedBlock}\n\n${input.message}` : input.message;

  const { error: userMessageError } = await db.from('messages').insert({
    conversation_id: conversation.id,
    role: 'user',
    content: userContent,
    skill_file_id: skillFile.id,
  });

  if (userMessageError) {
    throw new AppError(500, 'MESSAGE_CREATE_FAILED', 'Could not record your message.', {
      cause: userMessageError,
    });
  }

  let decision: (RouteDecision & { intent: SkillIntent }) | null = null;

  try {
    decision = await routeSkillTurn(input.message, attachedPromos.length, skillFile.name);
    handlers.onIntent(decision);
    console.log(`[skill-chat] routed intent=${decision.intent} source=${decision.source}`);

    const ctx: SkillAgentContext<Db> & { intent: SkillIntent } = {
      db,
      userId,
      conversationId: conversation.id,
      skillFile,
      currentContent,
      model: input.model ?? null,
      history,
      attachedPromos,
      userInstruction: input.message,
      intent: decision.intent,
      ...(signal ? { signal } : {}),
    };

    let fullText = '';
    let usageResult: {
      model: string;
      inputTokens: number | null;
      outputTokens: number | null;
      latencyMs: number;
    } | null = null;

    for await (const chunk of runSkillEditor(ctx)) {
      if (chunk.type === 'token') {
        fullText += chunk.text;
        handlers.onToken(chunk.text);
      } else {
        usageResult = chunk;
        handlers.onUsage(chunk);
      }
    }

    console.log(
      `[skill-chat] agent finished intent=${decision.intent} outputChars=${fullText.length} usage=${JSON.stringify(usageResult)}`,
    );

    const { error: assistantError } = await db.from('messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: fullText,
      skill_file_id: skillFile.id,
      intent: decision.intent,
      model: usageResult?.model ?? null,
      input_tokens: usageResult?.inputTokens ?? null,
      output_tokens: usageResult?.outputTokens ?? null,
      latency_ms: usageResult?.latencyMs ?? null,
    });

    if (assistantError) {
      throw new AppError(500, 'MESSAGE_CREATE_FAILED', 'Could not record the reply.', {
        cause: assistantError,
      });
    }

    console.log(`[skill-chat] === turn end === conversation=${conversation.id}`);
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'The chat failed. Please try again.';
    console.log(`[skill-chat] ✗ turn failed slug=${slug}: ${message}`);

    await db
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: '',
        skill_file_id: skillFile.id,
        intent: decision?.intent ?? null,
        error: message,
      })
      .then(undefined, () => undefined);

    throw err;
  }
}
