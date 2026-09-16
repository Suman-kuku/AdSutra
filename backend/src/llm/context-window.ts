/**
 * Token budgeting. See CLAUDE.md section 9: a 12-page script fits in context,
 * a 60-page one plus ten refinement turns does not.
 *
 * First generation sends the whole script. Refinement turns send a digest plus
 * the current promo and the last few messages — that split lives here so no
 * caller has to remember it.
 */

/** Rough English/Devanagari average. Good enough for budgeting, not billing. */
const CHARS_PER_TOKEN = 4;

/** Leaves room for the skill file, the transcript, and the response itself. */
const SCRIPT_TOKEN_BUDGET = 60_0000;

/** Refinement turns carry only this much script, as a digest. */
const DIGEST_TOKEN_BUDGET = 3_000;

/** Refinement turns replay at most this many prior messages. */
export const REFINE_HISTORY_LIMIT = 6;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function truncateToTokens(text: string, budget: number): { text: string; truncated: boolean } {
  const maxChars = budget * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: text.slice(0, maxChars), truncated: true };
}

/**
 * The script as it goes into a *first* generation: whole, unless it is so long
 * that it would crowd out everything else.
 */
export function scriptForFirstGeneration(extractedText: string): {
  text: string;
  truncated: boolean;
} {
  return truncateToTokens(extractedText, SCRIPT_TOKEN_BUDGET);
}

/**
 * A cheap extractive digest for refinement turns — the opening and closing of
 * the script, which is where a promo's hook and payoff usually live.
 *
 * Deliberately not model-generated: a digest that costs an LLM call defeats the
 * point of keeping refinements cheap. `episodes.script_digest` can hold a
 * better one later without changing callers.
 */
export function buildScriptDigest(extractedText: string, storedDigest?: string | null): string {
  if (storedDigest && storedDigest.trim().length > 0) {
    return truncateToTokens(storedDigest, DIGEST_TOKEN_BUDGET).text;
  }

  const maxChars = DIGEST_TOKEN_BUDGET * CHARS_PER_TOKEN;
  if (extractedText.length <= maxChars) return extractedText;

  const halfBudget = Math.floor(maxChars / 2);
  const opening = extractedText.slice(0, halfBudget);
  const closing = extractedText.slice(-halfBudget);
  return `${opening}\n\n[... middle of the script omitted ...]\n\n${closing}`;
}

/**
 * The script context for an EDIT or QUESTION turn — never the full script.
 * Wraps `buildScriptDigest` so callers never touch `episode.script_digest`
 * directly; nothing writes that column yet (CLAUDE.md section 11, "Open item").
 */
export function resolveScriptContext(episode: {
  extracted_text: string | null;
  script_digest: string | null;
}): string {
  return buildScriptDigest(episode.extracted_text ?? '', episode.script_digest);
}
