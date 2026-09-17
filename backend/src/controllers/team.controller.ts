import type { Request, RequestHandler } from 'express';
import type {
  APIResponse,
  CreateTeamInput,
  TeamDTO,
  UpdateTeamInput,
} from '@scriptcraft/shared';
import { supabaseForToken, type Db } from '../config/supabase.js';
import * as teamService from '../services/team.service.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * An RLS-scoped client acting as the caller, so the teams policies — read for
 * everyone, write for admins — are the second line of defence behind
 * `requireAdmin`.
 */
function dbFor(req: Request): { db: Db; userId: string } {
  if (!req.user || !req.accessToken) {
    throw AppError.unauthorized('Authentication required.', 'NO_SESSION');
  }
  return { db: supabaseForToken(req.accessToken), userId: req.user.id };
}

function teamId(req: Request): string {
  const id = req.params.id;
  if (!id) throw AppError.badRequest('Missing team id.', 'MISSING_ID');
  return id;
}

/** GET /teams — every team with its members. */
export const listTeams: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = dbFor(req);
      const rows = await teamService.listTeams(db);
      const body: APIResponse<TeamDTO[]> = { ok: true, data: rows.map(teamService.toTeamDTO) };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/** POST /teams — admin only. */
export const createTeam: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db, userId } = dbFor(req);
      const row = await teamService.createTeam(db, userId, req.body as CreateTeamInput);
      const body: APIResponse<TeamDTO> = { ok: true, data: teamService.toTeamDTO(row) };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/** PATCH /teams/:id — rename, replace the membership, or both. */
export const updateTeam: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = dbFor(req);
      const row = await teamService.updateTeam(db, teamId(req), req.body as UpdateTeamInput);
      const body: APIResponse<TeamDTO> = { ok: true, data: teamService.toTeamDTO(row) };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/** DELETE /teams/:id — removes the group, never the people in it. */
export const deleteTeam: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = dbFor(req);
      await teamService.deleteTeam(db, teamId(req));
      const body: APIResponse<{ id: string }> = { ok: true, data: { id: teamId(req) } };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};
