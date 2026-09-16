import type { Intent, RouteDecision } from '@scriptcraft/shared';

/** Step 1: an explicit choice (refine chip, Regenerate button) always wins. */
export function checkForcedIntent(forcedIntent?: Intent): RouteDecision | null {
  if (!forcedIntent) return null;
  return { intent: forcedIntent, source: 'forced' };
}

/**
 * Step 3: the composer only attaches `skillFileId` when its `@mention`
 * autocomplete picked a file this turn — that is the "explicit @skill-file
 * mention" CLAUDE.md section 11 refers to. Only meaningful once a promo
 * already exists; `routeMessage` handles the "no promo yet" case (step 2)
 * before this is ever reached.
 */
export function checkExplicitMention(skillFileId?: string): RouteDecision | null {
  if (!skillFileId) return null;
  return { intent: 'CREATE', source: 'precondition' };
}
