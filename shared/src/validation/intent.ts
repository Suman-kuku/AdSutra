import { z } from 'zod';
import { SELECTABLE_MODEL_IDS } from '../types/models.js';

export const intentSchema = z.enum(['CREATE', 'EDIT', 'QUESTION']);

/** Body of the one chat-write endpoint: POST /conversations/:id/generate. */
export const generateRequestSchema = z.object({
  /** What the user typed. */
  message: z.string().trim().min(1, 'Say what you want').max(2000),
  /** Set when the composer's @mention picked a skill file this turn. */
  skillFileId: z.string().uuid().optional(),
  /** Set by a refine chip or the Regenerate button — skips the classifier. */
  forcedIntent: intentSchema.optional(),
  /**
   * Which model generates this turn. Constrained to the gateway's allow list so
   * a caller cannot name an arbitrary model. Omitted falls back to the skill
   * file's own `model`, then `env.LITELLM_MODEL`. Never affects the classifier.
   */
  model: z.enum(SELECTABLE_MODEL_IDS).optional(),
});

export type GenerateRequestInput = z.infer<typeof generateRequestSchema>;

/** JSON the intent classifier must return. `max_tokens: 64`, so keep `reason` short. */
export const classifierOutputSchema = z.object({
  intent: intentSchema,
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1).max(280),
});

export type ClassifierOutput = z.infer<typeof classifierOutputSchema>;
