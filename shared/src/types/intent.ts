import type { Tables } from './db.js';
import type { SelectableModelId } from './models.js';

/**
 * What a user's chat turn means. See CLAUDE.md section 11 — one router picks
 * one of these per turn so the LLM never regenerates from scratch on a tweak.
 */
export type Intent = 'CREATE' | 'EDIT' | 'QUESTION';

/** How a `RouteDecision` was reached — surfaced to the UI via the `intent` SSE event. */
export type RouteSource = 'forced' | 'precondition' | 'classifier';

/** Raw output of the intent classifier, before routing rules are applied. */
export interface ClassifierResult {
  intent: Intent;
  confidence: number;
  reason: string;
}

/** The router's final answer for this turn. */
export interface RouteDecision {
  intent: Intent;
  source: RouteSource;
  /** Present when `source` is 'classifier'. */
  confidence?: number;
  reason?: string;
}

/**
 * Everything an executor agent needs to assemble its prompt. `TDb` is left
 * generic so this type carries no dependency on the Supabase client package —
 * the backend supplies it as `AgentContext<Db>`.
 *
 * Nothing here is persisted by the agent itself: chat turns are drafts. The
 * promo text lives only in `messages.content` until the user explicitly saves
 * it (`POST /conversations/:id/save-promo`), which is what actually inserts a
 * `promos` row.
 */
export interface AgentContext<TDb> {
  db: TDb;
  userId: string;
  conversationId: string;
  episode: Tables<'episodes'>;
  /** null for QUESTION, which needs no skill file. */
  skillFile: Tables<'skill_files'> | null;
  /**
   * The model the user picked in the chat for this turn, or null when they sent
   * none. Agents prefer it over the skill file's own `model`: an explicit pick
   * in the UI should win over a default baked into a prompt file. Null falls
   * through to `skillFile.model`, then `env.LITELLM_MODEL`.
   */
  model: SelectableModelId | null;
  /** The unsaved promo text currently in play, if any prior turn produced one. */
  currentDraft: { content: string } | null;
  /** Full transcript so far, oldest first — agents slice what they need. */
  history: Tables<'messages'>[];
  userInstruction: string;
  signal?: AbortSignal;
}

/** What an agent's `run()` yields: streamed text, then final usage. */
export type StreamChunk =
  | { type: 'token'; text: string }
  | {
      type: 'usage';
      model: string;
      inputTokens: number | null;
      outputTokens: number | null;
      latencyMs: number;
    };

/** Events streamed over `text/event-stream` by `POST /conversations/:id/generate`. */
export type GenerateStreamEvent =
  | { type: 'intent'; intent: Intent; confidence?: number; source: RouteSource }
  | { type: 'token'; text: string }
  | {
      type: 'usage';
      model: string;
      inputTokens: number | null;
      outputTokens: number | null;
      latencyMs: number;
    }
  | { type: 'error'; message: string }
  | { type: 'done' };
