/**
 * The models a creator may pick in the chat, as exposed by the LiteLLM gateway.
 *
 * This list is the single source of truth for both sides: the frontend renders
 * it in the picker, and `generateRequestSchema` validates against it, so an
 * arbitrary model id can never reach the gateway.
 *
 * It governs promo generation only. Intent classification always runs on
 * `env.CLASSIFIER_MODEL` — see CLAUDE.md section 11.
 */
export const SELECTABLE_MODEL_IDS = [
  'deepinfra/deepseek-ai/DeepSeek-V4-Pro',
  'deepinfra/deepseek-ai/DeepSeek-V4-Flash',
  'anthropic/claude-sonnet-5',
  'anthropic/claude-haiku-4-5',
] as const;

export type SelectableModelId = (typeof SELECTABLE_MODEL_IDS)[number];

export interface ModelDisplay {
  label: string;
  hint: string;
}

/**
 * Display copy per model. A `Record` rather than a second list so TypeScript
 * fails the build if a model id is added above and not described here.
 */
export const MODEL_DISPLAY: Record<SelectableModelId, ModelDisplay> = {
  'deepinfra/deepseek-ai/DeepSeek-V4-Pro': {
    label: 'DeepSeek V4 Pro',
    hint: 'Highest quality. The default.',
  },
  'deepinfra/deepseek-ai/DeepSeek-V4-Flash': {
    label: 'DeepSeek V4 Flash',
    hint: 'Faster and cheaper, a little less nuanced.',
  },
  'anthropic/claude-sonnet-5': {
    label: 'Claude Sonnet 5',
    hint: 'Strong at tone and character voice.',
  },
  'anthropic/claude-haiku-4-5': {
    label: 'Claude Haiku 4.5',
    hint: 'Quickest turnaround for rough drafts.',
  },
};

/** Ready to render: ids in picker order, each with its display copy. */
export const SELECTABLE_MODELS: readonly ({ id: SelectableModelId } & ModelDisplay)[] =
  SELECTABLE_MODEL_IDS.map((id) => ({ id, ...MODEL_DISPLAY[id] }));

/** What the chat uses when the user has never touched the picker. */
export const DEFAULT_MODEL_ID: SelectableModelId = 'deepinfra/deepseek-ai/DeepSeek-V4-Pro';

/** Narrows an unknown string — e.g. a stale value read back from localStorage. */
export function isSelectableModelId(value: string): value is SelectableModelId {
  return (SELECTABLE_MODEL_IDS as readonly string[]).includes(value);
}
