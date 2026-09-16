import { z } from 'zod';
import { SELECTABLE_MODEL_IDS } from '../types/models.js';

/**
 * Attaching more than this crowds the skill file itself out of the context
 * window — the promo texts win on sheer volume and the model starts editing
 * around them. CLAUDE.md section 12: the UI blocks the 9th.
 */
export const MAX_ATTACHED_PROMOS = 8;

/** How the user rated one attached promo. Typed by hand in phase A. */
export const promoVerdictSchema = z.enum(['worked', 'did_not_work', 'unclear']);

/**
 * One promo carried into a skill chat turn as structured context rather than
 * pasted prose, so the agent can tell the copy apart from the verdict on it.
 *
 * `content` is sent by the client rather than re-read server-side on purpose:
 * it is already on screen in the picker, and re-fetching eight rows to get
 * text the caller just displayed buys nothing. RLS still gates the picker.
 */
export const attachedPromoSchema = z.object({
  promoId: z.string().uuid(),
  /** The promo's own version within its lineage. */
  version: z.number().int().positive(),
  /**
   * Which version of the skill file produced it, snapshotted on the promo row.
   *
   * Without this a batch spanning two versions looks to the model like two
   * promos from one prompt, and "did v2 help?" cannot be answered — the whole
   * outcome difference gets attributed to wording. Nullable because very old
   * promos may predate the snapshot.
   */
  skillFileVersion: z.number().int().positive().nullish(),
  content: z.string().trim().min(1).max(20_000),
  verdict: promoVerdictSchema,
  /** One line of why. Optional — "I don't know why" is honest data. */
  why: z.string().trim().max(500).nullish(),
});

export type AttachedPromo = z.infer<typeof attachedPromoSchema>;
export type PromoVerdict = z.infer<typeof promoVerdictSchema>;

/** Body of POST /skill-files/:slug/chat — one streamed skill chat turn. */
export const skillChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Say what you want').max(2000),
  /**
   * Which version the editor has loaded. Omitted means the active one. Without
   * it a turn about v2 would be answered against v3, because the active version
   * is the only one the server could otherwise guess at.
   */
  version: z.number().int().positive().optional(),
  /**
   * The editor's exact text, unsaved edits included — what the user is actually
   * looking at, which is not always what is in the row. Sent so a refinement
   * builds on the revision in front of them rather than on the last save.
   */
  content: z.string().max(1_048_576).optional(),
  /** Any attachment at all forces EDIT — see `skill-chat.service.ts`. */
  attachedPromos: z.array(attachedPromoSchema).max(
    MAX_ATTACHED_PROMOS,
    `Attach at most ${MAX_ATTACHED_PROMOS} promos per turn. Send this batch first, then attach more.`,
  ).optional(),
  /** Same allow list as the episode chat. Never affects classification. */
  model: z.enum(SELECTABLE_MODEL_IDS).optional(),
});

export type SkillChatRequest = z.infer<typeof skillChatRequestSchema>;

/**
 * Body of POST /skill-files/:slug/publish — Save.
 *
 * `changelog` is required, not optional: six months on, "why does v3 say this?"
 * has to be answerable from the row itself.
 */
export const publishRequestSchema = z.object({
  content: z.string().trim().min(1, 'The skill file is empty').max(1_048_576),
  changelog: z.string().trim().min(1, 'Say in one line what changed').max(2000),
});

export type PublishRequest = z.infer<typeof publishRequestSchema>;

/**
 * Body of PUT /skill-files/:slug/versions/:version — edit a version in place.
 *
 * Unlike publish, `changelog` is optional: this does not create a version, so
 * there is usually nothing new to describe. Pass it to correct the existing
 * line.
 */
export const updateVersionRequestSchema = z.object({
  content: z.string().trim().min(1, 'The skill file is empty').max(1_048_576),
  changelog: z.string().trim().min(1).max(2000).optional(),
});

export type UpdateVersionRequest = z.infer<typeof updateVersionRequestSchema>;
