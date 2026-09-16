import type { AttachedPromo, Tables } from '@scriptcraft/shared';
import {
  SKILL_ATTACHMENTS_CLOSE,
  SKILL_ATTACHMENTS_OPEN,
  SKILL_FILE_CLOSE,
  SKILL_FILE_OPEN,
  SKILL_SUMMARY_CLOSE,
  SKILL_SUMMARY_OPEN,
} from '@scriptcraft/shared';
import type { LlmMessage } from '../../client.js';
import { REFINE_HISTORY_LIMIT } from '../../context-window.js';

type SkillFileRow = Tables<'skill_files'>;
type MessageRow = Tables<'messages'>;

/**
 * Past this, every revision has been adding rules and none removing them —
 * the file turns into a pile of narrow "don't repeat that one failure"
 * instructions and output quality drops. CLAUDE.md section 12.
 */
const BLOAT_WORD_LIMIT = 800;

const VERDICT_LABELS: Record<AttachedPromo['verdict'], string> = {
  worked: 'WORKED',
  did_not_work: 'DID NOT WORK',
  unclear: 'UNCLEAR',
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Renders an attached batch as structured context.
 *
 * Exported because the same string is written into `messages.content`, not
 * just into the prompt: batches are meant to accumulate, so batch 2's turn
 * has to find batch 1 in the replayed history. If the attachments lived only
 * in the prompt they would vanish the moment the turn ended.
 */
export function renderAttachedPromos(promos: AttachedPromo[]): string {
  if (promos.length === 0) return '';

  const blocks = promos.map((promo, index) =>
    [
      `<promo index="${index + 1}" made_with="${
        promo.skillFileVersion === null || promo.skillFileVersion === undefined
          ? 'unknown version'
          : `v${promo.skillFileVersion}`
      }" verdict="${VERDICT_LABELS[promo.verdict]}">`,
      promo.why ? `Why: ${promo.why}` : 'Why: (not given)',
      '',
      promo.content,
      '</promo>',
    ].join('\n'),
  );

  // Only worth saying when the batch actually spans versions — otherwise it is
  // a paragraph of instruction about a comparison that cannot be made.
  const spanned = [
    ...new Set(
      promos
        .map((promo) => promo.skillFileVersion)
        .filter((version): version is number => typeof version === 'number'),
    ),
  ].sort((a, b) => a - b);

  const crossVersion =
    spanned.length > 1
      ? [
          `These promos come from different versions of this skill file (${spanned
            .map((version) => `v${version}`)
            .join(', ')}).`,
          'So a difference in outcome may come from the version change rather than from the promo wording.',
          'Say which of the two you think it is, and say so plainly if you cannot tell them apart.',
        ].join('\n')
      : '';

  return [
    SKILL_ATTACHMENTS_OPEN,
    `Attached promos made from this skill file (${promos.length}):`,
    ...(crossVersion === '' ? [] : [crossVersion]),
    '',
    blocks.join('\n\n'),
    SKILL_ATTACHMENTS_CLOSE,
  ].join('\n');
}

/**
 * The file the turn is about, labelled with the version actually on screen.
 *
 * Both halves matter. Naming the version stops the model answering about v3
 * when the editor has v2 loaded. Saying when the text is unsaved stops it
 * describing the user's in-progress draft as though it were the published
 * version — it is neither v2 nor v3 at that point, and claiming otherwise is
 * the kind of confident wrong answer that is hard to catch.
 */
function currentFileBlock(skillFile: SkillFileRow, currentContent: string): string {
  const unsaved = currentContent.trim() !== skillFile.raw_md.trim();

  return [
    `This is the skill file "${skillFile.name}" (${skillFile.slug} v${skillFile.version})${
      unsaved ? ', with unsaved edits the user has in the editor right now' : ''
    }:`,
    '',
    '<current>',
    currentContent,
    '</current>',
    unsaved
      ? '\nThis text is NOT what v' +
        String(skillFile.version) +
        ' says as saved — it is the working copy. Reason about this text, and do not describe it as the published version.'
      : '',
  ]
    .filter((part) => part !== '')
    .join('\n');
}

/**
 * EDIT in the skill file chat: rewrite the whole `.md`.
 *
 * No script and no promo draft here — the material is the file itself, the
 * recent transcript (which is where earlier attached batches live), and
 * whatever batch came with this turn.
 */
export function buildSkillEditPrompt(params: {
  skillFile: SkillFileRow;
  /** The editor's current text — not necessarily what is saved in the row. */
  currentContent: string;
  history: MessageRow[];
  attachedPromos: AttachedPromo[];
  userInstruction: string;
}): { messages: LlmMessage[] } {
  const isBloated = wordCount(params.currentContent) > BLOAT_WORD_LIMIT;

  const rules = [
    'You revise skill files: reusable Markdown prompt files that tell another model how to write a promo for an audio show.',
    '',
    'Hard rules:',
    `1. Output the COMPLETE revised .md between ${SKILL_FILE_OPEN} and ${SKILL_FILE_CLOSE} — never a diff, never a fragment, never "unchanged sections omitted". The editor replaces its contents with exactly what you emit, so anything you leave out is deleted.`,
    '2. Preserve the YAML frontmatter block at the top. You may refine `description`, `tags`, `default_duration_sec`, `model` or `temperature`, but NEVER change `slug`, `name` or `category`: the slug is what ties every version of this file together, and changing it starts a separate lineage instead of a new version.',
    '3. Propose a removal alongside every addition. Say which existing rule the new one supersedes, or say plainly that nothing should go.',
    '4. Never claim certainty from single-digit samples. "There is not enough evidence yet" is a valid and often correct answer — if so, say it and change little or nothing.',
    '5. Flag confounds. If the promos that worked all come from one show, one episode or one campaign, the promo text probably is not the cause. Say so instead of writing a rule about it.',
    '',
    'When promos are attached, your summary must say: what the ones that worked have in common, what the ones that did not have in common, and which of those differences are probably coincidence.',
    'Each attached promo carries `made_with`, the version of this skill file that produced it. When a batch spans versions, treat the version as a candidate cause alongside the wording — do not assume the text explains the outcome.',
    isBloated
      ? `\nThis file is already over ${BLOAT_WORD_LIMIT} words. Say so in your summary, and cut at least as much as you add.`
      : '',
    '',
    'Answer in exactly this shape and nothing else:',
    `${SKILL_SUMMARY_OPEN}`,
    'A short prose summary of what you changed and why. Plain sentences, a few lines at most.',
    `${SKILL_SUMMARY_CLOSE}`,
    `${SKILL_FILE_OPEN}`,
    'the complete revised .md, frontmatter included',
    `${SKILL_FILE_CLOSE}`,
  ]
    .filter(Boolean)
    .join('\n');

  const messages: LlmMessage[] = [
    { role: 'system', content: rules },
    {
      role: 'user',
      content: currentFileBlock(params.skillFile, params.currentContent),
    },
  ];

  for (const message of params.history.slice(-REFINE_HISTORY_LIMIT)) {
    if (message.role === 'system' || message.error) continue;
    messages.push({ role: message.role, content: message.content });
  }

  const attached = renderAttachedPromos(params.attachedPromos);
  messages.push({
    role: 'user',
    content: [attached, attached ? '' : null, params.userInstruction]
      .filter((part) => part !== null && part !== '')
      .join('\n'),
  });

  return { messages };
}

/**
 * QUESTION in the skill file chat: answer about the file, change nothing.
 * Emits no `<skillfile>` block, which is what leaves the content panel alone.
 */
export function buildSkillQuestionPrompt(params: {
  skillFile: SkillFileRow;
  currentContent: string;
  history: MessageRow[];
  userInstruction: string;
}): { messages: LlmMessage[] } {
  const system = [
    'You answer questions about a skill file: a reusable Markdown prompt file that tells another model how to write a promo for an audio show.',
    '',
    'Answer in prose, directly and briefly. Quote the file where it helps.',
    'Do NOT rewrite the file and do NOT output a revised version — the user only asked a question.',
    'If the answer is not in the file, say so rather than inventing a rationale for it.',
  ].join('\n');

  const messages: LlmMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: currentFileBlock(params.skillFile, params.currentContent) },
  ];

  for (const message of params.history.slice(-REFINE_HISTORY_LIMIT)) {
    if (message.role === 'system' || message.error) continue;
    messages.push({ role: message.role, content: message.content });
  }

  messages.push({ role: 'user', content: params.userInstruction });

  return { messages };
}
