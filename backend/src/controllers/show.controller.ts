import type { Request, RequestHandler } from 'express';
import type { APIResponse, CreateShowInput, ShowDTO } from '@scriptcraft/shared';
import { supabaseForToken, type Db } from '../config/supabase.js';
import * as showService from '../services/show.service.js';
import { AppError } from '../middleware/errorHandler.js';

/** An RLS-scoped client acting as the caller. */
function dbFor(req: Request): { db: Db; userId: string } {
  if (!req.user || !req.accessToken) {
    throw AppError.unauthorized('Authentication required.', 'NO_SESSION');
  }
  return { db: supabaseForToken(req.accessToken), userId: req.user.id };
}

export const listShows: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = dbFor(req);
      const rows = await showService.listShows(db);
      const body: APIResponse<ShowDTO[]> = { ok: true, data: rows.map(showService.toShowDTO) };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const getShow: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = dbFor(req);
      const id = req.params.id;
      if (!id) throw AppError.badRequest('Missing show id.', 'MISSING_ID');

      const row = await showService.getShowById(db, id);
      const body: APIResponse<ShowDTO> = { ok: true, data: showService.toShowDTO(row) };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const createShow: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db, userId } = dbFor(req);
      const row = await showService.createShow(db, userId, req.body as CreateShowInput);
      const body: APIResponse<ShowDTO> = { ok: true, data: showService.toShowDTO(row) };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  })();
};
