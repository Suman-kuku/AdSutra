import type { Enums, Tables } from './db.js';
import type { SelectableModelId } from './models.js';
import type { AttachedPromo } from '../validation/skill-chat.js';
import type { ConversationDTO, MessageDTO } from './index.js';

/**
 * Skill file chat (CLAUDE.md section 12). Request shapes live in
 * `shared/src/validation/skill-chat.ts` and are inferred from their Zod
 * schemas — this file holds the response DTOs, the agent context, and the
 * output contract both sides parse.
 */

/** One promo in the attach picker: `promos` joined to the episode it ran on. */
export interface SkillFilePromoDTO {
  id: string;
  /** The promo's own version within its lineage. */
  version: number;
  /** Which version of this skill file produced it — what makes v1-vs-v2 comparable. */
  skillFileVersion: number | null;
  content: string;
  episodeId: string;
  episodeNumber: number | null;
  episodeTitle: string | null;
  createdAt: string;
}

/** GET /skill-files/:slug/chat — the open thread, or nothing yet. */
export interface SkillChatStateDTO {
  /** null until the first turn: the conversation is created lazily, as in the episode chat. */
  conversation: ConversationDTO | null;
  messages: MessageDTO[];
}

/**
 * What `skill-editor` needs. Deliberately not `AgentContext` — there is no
 * episode and no promo draft here, and widening the episode chat's context to
 * allow nulls would push a guard into all three of its agents. Same
 * `run(ctx): AsyncIterable<StreamChunk>` signature, different payload.
 */
export interface SkillAgentContext<TDb> {
  db: TDb;
  userId: string;
  conversationId: string;
  /** The version being worked on — whichever one the editor has loaded. */
  skillFile: Tables<'skill_files'>;
  /**
   * The text to reason about: the editor's current contents, which may carry
   * unsaved edits or a revision proposed earlier in this chat. Equal to
   * `skillFile.raw_md` when nothing has been changed.
   */
  currentContent: string;
  model: SelectableModelId | null;
  /** Full transcript so far, oldest first. The agent slices what it needs. */
  history: Tables<'messages'>[];
  /** Empty on a plain question. Non-empty forces EDIT. */
  attachedPromos: AttachedPromo[];
  userInstruction: string;
  signal?: AbortSignal;
}

/** Which chat a `conversations` row belongs to. */
export type ConversationKind = Enums<'conversation_kind'>;

/**
 * The output contract for an EDIT turn.
 *
 * The agent streams a prose summary and a complete `.md` in one response, so
 * the two need a separator the UI can split on *while tokens are still
 * arriving*. Tags rather than a markdown fence: skill files contain fenced
 * code blocks of their own, and a fence would end at the first inner ```.
 *
 * Lives in `shared/` because the agent's prompt writes these tags and the
 * content panel parses them — the same contract, so one definition.
 */
export const SKILL_SUMMARY_OPEN = '<summary>';
export const SKILL_SUMMARY_CLOSE = '</summary>';
export const SKILL_FILE_OPEN = '<skillfile>';
export const SKILL_FILE_CLOSE = '</skillfile>';

/**
 * Wraps the attached-promo block written into `messages.content`. The block is
 * persisted, not just prompted — batches accumulate across turns — so the
 * transcript needs a reliable boundary between it and what the user typed.
 */
export const SKILL_ATTACHMENTS_OPEN = '<attachments>';
export const SKILL_ATTACHMENTS_CLOSE = '</attachments>';

/**
 * Splits a persisted user turn back into its attachment block and the typed
 * message. Returns the whole string as `message` when nothing was attached.
 */
export function splitAttachedBlock(content: string): { attachments: string | null; message: string } {
  const start = content.indexOf(SKILL_ATTACHMENTS_OPEN);
  const end = content.indexOf(SKILL_ATTACHMENTS_CLOSE);
  if (start === -1 || end === -1 || end < start) return { attachments: null, message: content };

  return {
    attachments: content.slice(start + SKILL_ATTACHMENTS_OPEN.length, end).trim(),
    message: content.slice(end + SKILL_ATTACHMENTS_CLOSE.length).trim(),
  };
}

/** How many promos a persisted attachment block carried, for the transcript chip. */
export function countAttachedPromos(attachments: string): number {
  return (attachments.match(/<promo /g) ?? []).length;
}

/** One attached promo, read back out of a stored turn. */
export interface ParsedAttachedPromo {
  index: number;
  /** Which skill file version produced it, e.g. `v1`. Older turns may say nothing. */
  madeWith: string | null;
  /** `WORKED` / `DID NOT WORK` / `UNCLEAR`, as it was written into the prompt. */
  verdict: string;
  /** null when the user left it blank. */
  why: string | null;
  content: string;
}

/**
 * Reads the `<promo>` blocks back out of a persisted attachment block.
 *
 * The transcript stores exactly what the model was given, so this is the only
 * way to show the user what they actually sent — the verdicts and whys are in
 * there, not in any column. Tolerant by design: an older turn written before
 * `made_with` existed still parses, with `madeWith` null.
 */
export function parseAttachedPromos(attachments: string): ParsedAttachedPromo[] {
  const blocks = attachments.matchAll(/<promo\s([^>]*)>\n([\s\S]*?)\n<\/promo>/g);
  const parsed: ParsedAttachedPromo[] = [];

  for (const block of blocks) {
    const attrs = block[1] ?? '';
    const body = block[2] ?? '';

    const attr = (name: string): string | null =>
      new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1] ?? null;

    // The renderer writes `Why: …` as the first line, then a blank line, then
    // the promo text.
    const [whyLine = '', ...rest] = body.split('\n');
    const why = whyLine.startsWith('Why: ') ? whyLine.slice('Why: '.length) : null;

    parsed.push({
      index: Number(attr('index') ?? parsed.length + 1),
      madeWith: attr('made_with'),
      verdict: attr('verdict') ?? 'UNCLEAR',
      why: why === null || why === '(not given)' ? null : why,
      content: (why === null ? body : rest.join('\n')).trim(),
    });
  }

  return parsed;
}

export interface SkillEditorOutput {
  /** The prose half — what changed and why. Shown in the chat bubble. */
  summary: string;
  /**
   * The complete revised `.md`, or null when the turn produced no file (a
   * QUESTION answer, or an EDIT still streaming its summary). The content
   * panel only replaces itself once this is non-null.
   */
  skillFile: string | null;
}

/**
 * Splits one assistant turn into its two halves. Safe to call on a partial
 * stream: an unterminated section returns what has arrived so far, so the
 * panel fills in progressively rather than snapping in at the end.
 *
 * Untagged output — which is what a QUESTION turn produces — comes back whole
 * as the summary, with no file. That is also the graceful failure mode if a
 * model ignores the tags: the user sees the text instead of a blank panel.
 */
export function splitSkillEditorOutput(text: string): SkillEditorOutput {
  const fileStart = text.indexOf(SKILL_FILE_OPEN);

  const summarySource = fileStart === -1 ? text : text.slice(0, fileStart);
  const summaryOpen = summarySource.indexOf(SKILL_SUMMARY_OPEN);
  let summary: string;
  if (summaryOpen === -1) {
    summary = summarySource;
  } else {
    const body = summarySource.slice(summaryOpen + SKILL_SUMMARY_OPEN.length);
    const summaryClose = body.indexOf(SKILL_SUMMARY_CLOSE);
    summary = summaryClose === -1 ? body : body.slice(0, summaryClose);
  }

  if (fileStart === -1) return { summary: summary.trim(), skillFile: null };

  const fileBody = text.slice(fileStart + SKILL_FILE_OPEN.length);
  const fileClose = fileBody.indexOf(SKILL_FILE_CLOSE);
  const skillFile = fileClose === -1 ? fileBody : fileBody.slice(0, fileClose);

  return { summary: summary.trim(), skillFile: skillFile.replace(/^\n/, '') };
}
