import type {
  AgentContext,
  GenerateRequestInput,
  Intent,
  RouteDecision,
  StreamChunk,
  Tables,
} from '@scriptcraft/shared';
import type { Db } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { run as runPromoCreator } from '../llm/agents/promo-creator/run.js';
import { run as runPromoEditor } from '../llm/agents/promo-editor/run.js';
import { run as runQaResponder } from '../llm/agents/qa-responder/run.js';
import { routeMessage } from '../llm/router/index.js';
import { getConversationById, getLatestDraftMessage, listMessages } from './conversation.service.js';
import { getEpisodeById } from './episode.service.js';
import { getSkillFileById } from './skill-file.service.js';

type SkillFileRow = Tables<'skill_files'>;
type MessageRow = Tables<'messages'>;

const AGENTS: Record<Intent, (ctx: AgentContext<Db>) => AsyncIterable<StreamChunk>> = {
  CREATE: runPromoCreator,
  EDIT: runPromoEditor,
  QUESTION: runQaResponder,
};

export interface GenerateTurnHandlers {
  onIntent: (decision: RouteDecision) => void;
  onToken: (text: string) => void;
  onUsage: (usage: {
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
    latencyMs: number;
  }) => void;
}

async function resolveSkillFile(
  db: Db,
  intent: Intent,
  requestedSkillFileId: string | undefined,
  draft: MessageRow | null,
): Promise<SkillFileRow | null> {
  if (intent === 'CREATE') {
    if (!requestedSkillFileId) {
      throw AppError.badRequest('Pick a skill file with @ before generating.', 'SKILL_FILE_REQUIRED');
    }
    return getSkillFileById(db, requestedSkillFileId);
  }

  if (intent === 'EDIT') {
    if (!draft) {
      throw AppError.conflict('Generate a promo before refining it.', 'NO_PROMO_YET');
    }
    if (!draft.skill_file_id) {
      throw AppError.conflict('This promo has no skill file to refine with.', 'NO_SKILL_FILE');
    }
    return getSkillFileById(db, draft.skill_file_id);
  }

  return null; // QUESTION needs no skill file.
}

/**
 * The one chat-write path: load state → route → run the matching agent →
 * stream its output → persist. `messages` is append-only, so the user's turn
 * is written before routing even runs, and a failed turn still gets an
 * assistant row with `error` set — that is what keeps admin history honest.
 *
 * Nothing here touches the `promos` table. Every turn's output is a draft
 * living only in `messages.content` until the user explicitly saves it via
 * `POST /conversations/:id/save-promo`.
 */
export async function runGenerateTurn(
  db: Db,
  userId: string,
  conversationId: string,
  input: GenerateRequestInput,
  handlers: GenerateTurnHandlers,
  signal?: AbortSignal,
): Promise<void> {
  console.log(
    `\n[chat] === turn start === convo=${conversationId} user=${userId} skillFileId=${
      input.skillFileId ?? 'none'
    } forcedIntent=${input.forcedIntent ?? 'none'} model=${
      input.model ?? 'default'
    } message="${input.message}"`,
  );

  const conversation = await getConversationById(db, conversationId);

  // `conversations` now also holds skill file chats, which have no episode
  // (CLAUDE.md section 12). This endpoint is the episode chat's only write
  // path, so anything else reaching it is a client bug, not a user error.
  if (conversation.kind !== 'episode' || !conversation.episode_id) {
    throw AppError.badRequest(
      'This conversation is not an episode chat.',
      'NOT_EPISODE_CONVERSATION',
    );
  }

  const episode = await getEpisodeById(db, conversation.episode_id);

  if (episode.status !== 'ready' || !episode.extracted_text) {
    throw AppError.conflict('This episode has no parsed script yet.', 'SCRIPT_NOT_READY');
  }

  // Read before the new turn is written, so it is not echoed back to itself.
  const history = await listMessages(db, conversationId);
  const draft = await getLatestDraftMessage(db, conversationId);
  console.log(`[chat] existing draft: ${draft ? `${draft.content.length} chars` : 'none'}`);

  const { data: userMessage, error: userMessageError } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: input.message,
      skill_file_id: input.skillFileId ?? null,
    })
    .select('id')
    .single();

  if (userMessageError || !userMessage) {
    throw new AppError(500, 'MESSAGE_CREATE_FAILED', 'Could not record your message.', {
      cause: userMessageError,
    });
  }

  // Hoisted so the failure path below can record which intent was in flight.
  let decision: RouteDecision | null = null;

  try {
    decision = await routeMessage({
      message: input.message,
      forcedIntent: input.forcedIntent,
      skillFileId: input.skillFileId,
      hasPromo: draft !== null,
      currentPromoExcerpt: draft?.content.slice(0, 200) ?? null,
    });
    handlers.onIntent(decision);

    const skillFile = await resolveSkillFile(db, decision.intent, input.skillFileId, draft);
    console.log(
      `[chat] resolved intent=${decision.intent} skillFile=${skillFile ? `${skillFile.slug} v${skillFile.version}` : 'none'}`,
    );

    const ctx: AgentContext<Db> = {
      db,
      userId,
      conversationId,
      episode,
      skillFile,
      // The user's pick for this turn. Agents prefer it over `skillFile.model`.
      model: input.model ?? null,
      currentDraft: draft ? { content: draft.content } : null,
      history,
      userInstruction: input.message,
      signal,
    };

    let fullText = '';
    let usageResult: {
      model: string;
      inputTokens: number | null;
      outputTokens: number | null;
      latencyMs: number;
    } | null = null;

    for await (const chunk of AGENTS[decision.intent](ctx)) {
      if (chunk.type === 'token') {
        fullText += chunk.text;
        handlers.onToken(chunk.text);
      } else {
        usageResult = chunk;
        handlers.onUsage(chunk);
      }
    }

    console.log(
      `[chat] agent finished intent=${decision.intent} outputChars=${fullText.length} usage=${JSON.stringify(usageResult)}`,
    );

    const { error: assistantError } = await db.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: fullText,
      skill_file_id: skillFile?.id ?? null,
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

    console.log(`[chat] assistant message saved convo=${conversationId}`);

    // Remember the choice so the next turn in this thread defaults to it.
    if (skillFile) {
      await db
        .from('conversations')
        .update({ active_skill_file_id: skillFile.id })
        .eq('id', conversationId);
    }
    console.log(`[chat] === turn end === convo=${conversationId}`);
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'Generation failed. Please try again.';
    console.log(`[chat] ✗ turn failed convo=${conversationId}: ${message}`);

    await db
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: '',
        skill_file_id: input.skillFileId ?? null,
        intent: decision?.intent ?? null,
        error: message,
      })
      .then(undefined, () => undefined);

    throw err;
  }
}
