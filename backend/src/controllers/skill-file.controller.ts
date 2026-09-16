import type { Request, RequestHandler, Response } from 'express';
import type {
  APIResponse,
  GenerateStreamEvent,
  PublishRequest,
  UpdateVersionRequest,
  SkillChatRequest,
  SkillChatStateDTO,
  SkillFileDetailDTO,
  SkillFilePromoDTO,
  SkillFileSummaryDTO,
  SkillFileVersionDTO,
  UploadSkillFileInput,
} from '@scriptcraft/shared';
import { supabaseForToken, type Db } from '../config/supabase.js';
import * as skillFileService from '../services/skill-file.service.js';
import * as skillChatService from '../services/skill-chat.service.js';
import { AppError } from '../middleware/errorHandler.js';

function contextFor(req: Request): { db: Db; userId: string } {
  if (!req.user || !req.accessToken) {
    throw AppError.unauthorized('Authentication required.', 'NO_SESSION');
  }
  return { db: supabaseForToken(req.accessToken), userId: req.user.id };
}

export const listSkillFiles: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = contextFor(req);
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      // `?versions=all` — every version, for the chat's @ picker.
      const includeAllVersions = req.query.versions === 'all';

      const data = await skillFileService.listSkillFileSummaries(
        db,
        category,
        includeAllVersions,
      );
      const body: APIResponse<SkillFileSummaryDTO[]> = { ok: true, data };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const uploadSkillFile: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db, userId } = contextFor(req);
      const row = await skillFileService.uploadSkillFile(
        db,
        userId,
        req.body as UploadSkillFileInput,
      );
      const body: APIResponse<SkillFileDetailDTO> = {
        ok: true,
        data: skillFileService.toSkillFileDetailDTO(row),
      };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const getSkillFile: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = contextFor(req);
      const slug = req.params.slug;
      if (!slug) throw AppError.badRequest('Missing slug.', 'MISSING_SLUG');

      const row = await skillFileService.getActiveSkillFile(db, slug);
      const body: APIResponse<SkillFileDetailDTO> = {
        ok: true,
        data: skillFileService.toSkillFileDetailDTO(row),
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const getSkillFileVersions: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = contextFor(req);
      const slug = req.params.slug;
      if (!slug) throw AppError.badRequest('Missing slug.', 'MISSING_SLUG');

      const data = await skillFileService.listSkillFileVersionsWithUses(db, slug);
      const body: APIResponse<SkillFileVersionDTO[]> = { ok: true, data };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/** Opens the SSE stream. Once these headers are out, errors go down the stream. */
function openStream(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Stops nginx and friends buffering the stream into one lump.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
}

function sendEvent(res: Response, event: GenerateStreamEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function slugFrom(req: Request): string {
  const slug = req.params.slug;
  if (!slug) throw AppError.badRequest('Missing slug.', 'MISSING_SLUG');
  return slug;
}

/**
 * GET /skill-files/:slug/promos — promos made from any version of this file,
 * newest first. Feeds the attach picker; RLS keeps it to the caller's own.
 */
export const listSkillFilePromos: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = contextFor(req);
      const rows = await skillFileService.listPromosForSlug(db, slugFrom(req));
      const body: APIResponse<SkillFilePromoDTO[]> = {
        ok: true,
        data: rows.map(skillFileService.toSkillFilePromoDTO),
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/** GET /skill-files/:slug/chat — the open thread and its transcript, or nothing yet. */
export const getSkillChat: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db, userId } = contextFor(req);
      const state = await skillChatService.getSkillChatState(db, userId, slugFrom(req));
      const body: APIResponse<SkillChatStateDTO> = { ok: true, data: state };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/**
 * POST /skill-files/:slug/chat — one streamed turn (CLAUDE.md section 12).
 * Thin by design: `skill-chat.service` owns routing, the agent and
 * persistence; this only opens the stream and wires the callbacks.
 *
 * Reuses the episode chat's `GenerateStreamEvent` frames so the frontend has
 * one SSE parser, not two. CREATE never appears on this stream.
 */
export const postSkillChat: RequestHandler = (req, res, next) => {
  void (async () => {
    const { db, userId } = contextFor(req);
    let streamOpen = false;

    try {
      const slug = slugFrom(req);
      const input = req.body as SkillChatRequest;

      openStream(res);
      streamOpen = true;

      const abort = new AbortController();
      req.on('close', () => abort.abort());

      await skillChatService.runSkillChatTurn(
        db,
        userId,
        slug,
        input,
        {
          onIntent: (decision) =>
            sendEvent(res, {
              type: 'intent',
              intent: decision.intent,
              ...(decision.confidence === undefined ? {} : { confidence: decision.confidence }),
              source: decision.source,
            }),
          onToken: (text) => sendEvent(res, { type: 'token', text }),
          onUsage: (usage) => sendEvent(res, { type: 'usage', ...usage }),
        },
        abort.signal,
      );

      sendEvent(res, { type: 'done' });
      res.end();
    } catch (err) {
      const isApp = err instanceof AppError;
      const message = isApp ? err.message : 'The chat failed. Please try again.';

      if (!isApp || err.statusCode >= 500) console.error('[skill-chat]', err);

      if (streamOpen) {
        sendEvent(res, { type: 'error', message });
        res.end();
        return;
      }
      next(err);
    }
  })();
};

/**
 * POST /skill-files/:slug/chat/clear — "Clear chat". Archives the thread;
 * nothing is erased, and admins keep the transcript.
 */
export const clearSkillChat: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db, userId } = contextFor(req);
      await skillChatService.clearSkillChat(db, userId, slugFrom(req));
      const body: APIResponse<null> = { ok: true, data: null };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/**
 * POST /skill-files/:slug/publish — Save. Commits the content panel's text as
 * one new version. There is no in-place update path for a skill file.
 */
export const publishSkillFile: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db, userId } = contextFor(req);
      const row = await skillFileService.publishVersion(
        db,
        userId,
        slugFrom(req),
        req.body as PublishRequest,
      );
      const body: APIResponse<SkillFileDetailDTO> = {
        ok: true,
        data: skillFileService.toSkillFileDetailDTO(row),
      };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/** Rejects a non-numeric or nonsensical `:version` before it reaches the service. */
function versionFrom(req: Request): number {
  const raw = req.params.version;
  const version = Number(raw);
  if (!raw || !Number.isInteger(version) || version < 1) {
    throw AppError.badRequest('Version must be a whole number, 1 or higher.', 'INVALID_VERSION');
  }
  return version;
}

/**
 * GET /skill-files/:slug/versions/:version — one version's full `.md`.
 *
 * Separate from the versions list on purpose: the list is rendered for every
 * version at once, and carrying each one's full text would send the whole
 * history down the wire to draw a few changelog lines.
 */
export const getSkillFileVersionDetail: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = contextFor(req);
      const row = await skillFileService.getSkillFileVersion(db, slugFrom(req), versionFrom(req));
      const body: APIResponse<SkillFileDetailDTO> = {
        ok: true,
        data: skillFileService.toSkillFileDetailDTO(row),
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/**
 * PUT /skill-files/:slug/versions/:version — edit a version in place.
 *
 * The second of the two save paths. Unlike `/publish` this creates no row, so
 * promos already made with this version keep pointing at it while its text
 * changes underneath them — see the service for why that is accepted.
 */
export const updateSkillFileVersion: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = contextFor(req);
      const row = await skillFileService.updateVersionInPlace(
        db,
        slugFrom(req),
        versionFrom(req),
        req.body as UpdateVersionRequest,
      );
      const body: APIResponse<SkillFileDetailDTO> = {
        ok: true,
        data: skillFileService.toSkillFileDetailDTO(row),
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};
