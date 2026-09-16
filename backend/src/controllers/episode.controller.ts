import type { Request, RequestHandler } from 'express';
import type {
  APIResponse,
  CreateEpisodeInput,
  EpisodeDTO,
  EpisodeScriptDTO,
  ScriptFileUrlDTO,
  UploadTicketDTO,
  UploadUrlInput,
} from '@scriptcraft/shared';
import { supabaseForToken, type Db } from '../config/supabase.js';
import * as episodeService from '../services/episode.service.js';
import { runParseScriptJob } from '../jobs/parse-script.job.js';
import { AppError } from '../middleware/errorHandler.js';

function dbFor(req: Request): Db {
  if (!req.user || !req.accessToken) {
    throw AppError.unauthorized('Authentication required.', 'NO_SESSION');
  }
  return supabaseForToken(req.accessToken);
}

export const createUploadUrl: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const ticket = await episodeService.createUploadTicket(
        dbFor(req),
        req.body as UploadUrlInput,
      );
      const body: APIResponse<UploadTicketDTO> = { ok: true, data: ticket };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const createEpisode: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const row = await episodeService.createEpisode(dbFor(req), req.body as CreateEpisodeInput);

      // Parse in the background: the client gets its episode immediately and
      // polls the status, rather than waiting on a multi-megabyte PDF.
      void runParseScriptJob(row.id);

      const body: APIResponse<EpisodeDTO> = { ok: true, data: episodeService.toEpisodeDTO(row) };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const getEpisode: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const id = req.params.id;
      if (!id) throw AppError.badRequest('Missing episode id.', 'MISSING_ID');

      const row = await episodeService.getEpisodeById(dbFor(req), id);
      const body: APIResponse<EpisodeDTO> = { ok: true, data: episodeService.toEpisodeDTO(row) };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const getEpisodeScript: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const id = req.params.id;
      if (!id) throw AppError.badRequest('Missing episode id.', 'MISSING_ID');

      const data = await episodeService.getEpisodeScript(dbFor(req), id);
      const body: APIResponse<EpisodeScriptDTO> = { ok: true, data };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const getScriptFileUrl: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const id = req.params.id;
      if (!id) throw AppError.badRequest('Missing episode id.', 'MISSING_ID');

      const data = await episodeService.createScriptFileUrl(dbFor(req), id);
      const body: APIResponse<ScriptFileUrlDTO> = { ok: true, data };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const deleteEpisode: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const id = req.params.id;
      if (!id) throw AppError.badRequest('Missing episode id.', 'MISSING_ID');

      await episodeService.deleteEpisode(dbFor(req), id);
      const body: APIResponse<null> = { ok: true, data: null };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const listEpisodesForShow: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const showId = req.params.id;
      if (!showId) throw AppError.badRequest('Missing show id.', 'MISSING_ID');

      const rows = await episodeService.listEpisodesForShow(dbFor(req), showId);
      const body: APIResponse<EpisodeDTO[]> = {
        ok: true,
        data: rows.map(episodeService.toEpisodeDTO),
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};
