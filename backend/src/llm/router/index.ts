import type { ClassifierResult, Intent, RouteDecision } from '@scriptcraft/shared';
import { classifyIntent } from '../agents/intent-classifier/classify.js';
import { checkExplicitMention, checkForcedIntent } from './preconditions.js';

/**
 * Below this, the classifier's own pick is treated as unreliable. See the
 * fallback rationale in CLAUDE.md section 11: a wrong CREATE throws away the
 * user's in-progress promo and burns full script context, a wrong EDIT just
 * produces a weaker answer — so bias toward EDIT when a promo exists.
 */
const CONFIDENCE_THRESHOLD = 0.5;

export interface RouteInput {
  message: string;
  forcedIntent?: Intent;
  /** Set only when the composer's @mention picked a skill file this turn. */
  skillFileId?: string;
  hasPromo: boolean;
  currentPromoExcerpt?: string | null;
}

function lowConfidenceFallback(input: RouteInput): Intent {
  if (input.hasPromo) return 'EDIT';
  return input.skillFileId ? 'CREATE' : 'QUESTION';
}

function toDecision(classification: ClassifierResult, input: RouteInput): RouteDecision {
  if (classification.confidence < CONFIDENCE_THRESHOLD) {
    return {
      intent: lowConfidenceFallback(input),
      source: 'classifier',
      confidence: classification.confidence,
      reason: `Low-confidence fallback (classifier said ${classification.intent}: ${classification.reason})`,
    };
  }

  return {
    intent: classification.intent,
    source: 'classifier',
    confidence: classification.confidence,
    reason: classification.reason,
  };
}

/**
 * First match wins, in the exact order of CLAUDE.md section 11:
 *   1. `forcedIntent` — no classifier call.
 *   2. No promo yet — classify against CREATE/QUESTION only.
 *   3. Explicit skill-file mention — CREATE, no classifier call. (Only
 *      reachable once a promo exists: step 2 already claimed "no promo yet".)
 *   4. Otherwise — classify against all three intents.
 */
export async function routeMessage(input: RouteInput): Promise<RouteDecision> {
  console.log(
    `[router] input hasPromo=${input.hasPromo} skillFileId=${input.skillFileId ?? 'none'} forcedIntent=${
      input.forcedIntent ?? 'none'
    } message="${input.message}"`,
  );

  const forced = checkForcedIntent(input.forcedIntent);
  if (forced) {
    console.log('[router] step 1: forcedIntent →', forced);
    return forced;
  }

  if (!input.hasPromo) {
    console.log('[router] step 2: no draft yet → classifying against CREATE/QUESTION only');
    const classification = await classifyIntent({
      message: input.message,
      allowedIntents: ['CREATE', 'QUESTION'],
      currentPromoExcerpt: input.currentPromoExcerpt,
    });
    const decision = toDecision(classification, input);
    console.log('[router] decision:', decision);
    return decision;
  }

  const mention = checkExplicitMention(input.skillFileId);
  if (mention) {
    console.log('[router] step 3: explicit @skill-file mention →', mention);
    return mention;
  }

  console.log('[router] step 4: classifying against CREATE/EDIT/QUESTION');
  const classification = await classifyIntent({
    message: input.message,
    allowedIntents: ['CREATE', 'EDIT', 'QUESTION'],
    currentPromoExcerpt: input.currentPromoExcerpt,
  });
  const decision = toDecision(classification, input);
  console.log('[router] decision:', decision);
  return decision;
}
