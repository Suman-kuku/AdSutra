import type { Request, RequestHandler } from 'express';
import type { APIResponse, SavedPromoDTO, Tables } from '@scriptcraft/shared';
import { supabaseForToken, type Db } from '../config/supabase.js';
import {
  deletePromo as deletePromoService,
  listSavedPromosForEpisode,
  saveLatestDraftAsPromo,
} from '../services/promo.service.js';
import { AppError } from '../middleware/errorHandler.js';

type PromoRow = Tables<'promos'>;

function contextFor(req: Request): { db: Db; userId: string } {
  if (!req.user || !req.accessToken) {
    throw AppError.unauthorized('Authentication required.', 'NO_SESSION');
  }
  return { db: supabaseForToken(req.accessToken), userId: req.user.id };
}

function toSavedPromoDTO(row: PromoRow): SavedPromoDTO {
  return {
    id: row.id,
    version: row.version,
    rootPromoId: row.root_promo_id ?? row.id,
    parentPromoId: row.parent_promo_id,
    skillFileId: row.skill_file_id,
    skillFileSlug: row.skill_file_slug,
    content: row.content,
    createdAt: row.created_at,
  };
}

/**
 * GET /episodes/:id/promos — every promo version saved against this episode,
 * oldest first; the client groups them by `rootPromoId` into promos and their
 * history. Drafts are not included: they live in the transcript until Save.
 *
 * Episode-scoped, not conversation-scoped, so archiving a thread does not hide
 * the promos that were saved from it.
 */
export const listEpisodePromos: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = contextFor(req);
      const episodeId = req.params.id;
      if (!episodeId) throw AppError.badRequest('Missing episode id.', 'MISSING_ID');

      const promos = await listSavedPromosForEpisode(db, episodeId);
      const body: APIResponse<SavedPromoDTO[]> = { ok: true, data: promos.map(toSavedPromoDTO) };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/**
 * POST /conversations/:id/save-promo — commits the chat's current draft as a
 * new `promos` version. Nothing else in the chat flow writes to `promos`;
 * every turn's output stays a draft in `messages.content` until this is called.
 */
export const savePromo: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db, userId } = contextFor(req);
      const conversationId = req.params.id;
      if (!conversationId) throw AppError.badRequest('Missing conversation id.', 'MISSING_ID');

      const promo = await saveLatestDraftAsPromo(db, userId, conversationId);
      const body: APIResponse<SavedPromoDTO> = { ok: true, data: toSavedPromoDTO(promo) };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/**
 * DELETE /promos/:id — permanently removes one saved promo version.
 *
 * Unlike archiving a conversation, nothing is recoverable afterwards; the
 * service comments spell out what else goes with it.
 */
export const deletePromo: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = contextFor(req);
      const promoId = req.params.id;
      if (!promoId) throw AppError.badRequest('Missing promo id.', 'MISSING_ID');

      await deletePromoService(db, promoId);
      const body: APIResponse<null> = { ok: true, data: null };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};
