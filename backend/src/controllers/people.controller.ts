import type { Request, RequestHandler, Response } from 'express';
import type { APIResponse, PersonAdminDTO, Tables, UpdatePersonRoleInput } from '@scriptcraft/shared';
import { peopleListQuerySchema } from '@scriptcraft/shared';
import * as peopleService from '../services/people.service.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Admin-only. These routes read and write *other people's* rows, which RLS
 * scopes to self, so the service layer uses the service-role client and
 * `requireAdmin` is the gate. Every handler here needs to know who is acting,
 * to stop an admin locking themselves out.
 */
function actorId(req: Request): string {
  if (!req.user) {
    throw AppError.unauthorized('Authentication required.', 'NO_SESSION');
  }
  return req.user.id;
}

function personId(req: Request): string {
  const id = req.params.id;
  if (!id) throw AppError.badRequest('Missing person id.', 'MISSING_ID');
  return id;
}

/** Sends one person back — the shape every write here answers with. */
function respondWithPerson(res: Response, row: Tables<'people'>): void {
  const body: APIResponse<PersonAdminDTO> = {
    ok: true,
    data: peopleService.toPersonAdminDTO(row),
  };
  res.json(body);
}

/**
 * GET /admin/people?status=approved|pending|denied — one access state at a
 * time. `approved` is the Active tab, `pending` the waitlist, `denied` the
 * people an admin turned away or removed.
 */
export const listPeople: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const parsed = peopleListQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw AppError.badRequest('Unknown access status.', 'VALIDATION_FAILED');
      }

      const rows = await peopleService.listPeopleByStatus(parsed.data.status);
      const body: APIResponse<PersonAdminDTO[]> = {
        ok: true,
        data: rows.map(peopleService.toPersonAdminDTO),
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/**
 * POST /admin/people/:id/deny — "Remove" on the Active tab, "Reject" on the
 * waitlist. Both set `denied`, and both are undone by approve.
 */
export const denyPerson: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      respondWithPerson(res, await peopleService.denyPerson(personId(req), actorId(req)));
    } catch (err) {
      next(err);
    }
  })();
};

/** POST /admin/people/:id/approve — grants access, as `creator`. */
export const approvePerson: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      respondWithPerson(res, await peopleService.approvePerson(personId(req)));
    } catch (err) {
      next(err);
    }
  })();
};

/** PATCH /admin/people/:id/role */
export const updatePersonRole: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { role } = req.body as UpdatePersonRoleInput;
      respondWithPerson(res, await peopleService.setPersonRole(personId(req), role, actorId(req)));
    } catch (err) {
      next(err);
    }
  })();
};
