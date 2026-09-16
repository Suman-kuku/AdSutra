import type { Request, RequestHandler, Response } from 'express';
import type {
  APIResponse,
  ConversationDTO,
  CreateConversationInput,
  GenerateRequestInput,
  GenerateStreamEvent,
  MessageDTO,
} from '@scriptcraft/shared';
import { supabaseForToken, type Db } from '../config/supabase.js';
import * as conversationService from '../services/conversation.service.js';
import { runGenerateTurn } from '../services/chat.service.js';
import { AppError } from '../middleware/errorHandler.js';

function contextFor(req: Request): { db: Db; userId: string } {
  if (!req.user || !req.accessToken) {
    throw AppError.unauthorized('Authentication required.', 'NO_SESSION');
  }
  return { db: supabaseForToken(req.accessToken), userId: req.user.id };
}

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

function send(res: Response, event: GenerateStreamEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export const listConversations: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = contextFor(req);
      const episodeId = req.query.episodeId;
      if (typeof episodeId !== 'string' || episodeId.length === 0) {
        throw AppError.badRequest('episodeId query parameter is required.', 'MISSING_EPISODE_ID');
      }

      const rows = await conversationService.listConversationsForEpisode(db, episodeId);
      const body: APIResponse<ConversationDTO[]> = {
        ok: true,
        data: rows.map(conversationService.toConversationDTO),
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/**
 * POST /conversations/:id/generate — the only chat write endpoint (CLAUDE.md
 * section 11). Thin by design: `chat.service` owns routing, agent dispatch,
 * and persistence — this just validates the id, opens the SSE stream, wires
 * `chat.service`'s callbacks to `send()`, and turns a thrown error into the
 * `error` frame (or a plain JSON response, if that happens before the stream
 * opens).
 */
export const generateTurn: RequestHandler = (req, res, next) => {
  void (async () => {
    const { db, userId } = contextFor(req);
    const conversationId = req.params.id;
    let streamOpen = false;

    try {
      if (!conversationId) throw AppError.badRequest('Missing conversation id.', 'MISSING_ID');
      const input = req.body as GenerateRequestInput;

      openStream(res);
      streamOpen = true;

      const abort = new AbortController();
      req.on('close', () => abort.abort());

      await runGenerateTurn(
        db,
        userId,
        conversationId,
        input,
        {
          onIntent: (decision) =>
            send(res, {
              type: 'intent',
              intent: decision.intent,
              confidence: decision.confidence,
              source: decision.source,
            }),
          onToken: (text) => send(res, { type: 'token', text }),
          onUsage: (usage) => send(res, { type: 'usage', ...usage }),
        },
        abort.signal,
      );

      send(res, { type: 'done' });
      res.end();
    } catch (err) {
      const isApp = err instanceof AppError;
      const message = isApp ? err.message : 'Generation failed. Please try again.';

      if (!isApp || err.statusCode >= 500) console.error('[generate]', err);

      if (streamOpen) {
        send(res, { type: 'error', message });
        res.end();
        return;
      }
      next(err);
    }
  })();
};

export const createConversation: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db, userId } = contextFor(req);
      const row = await conversationService.createConversation(
        db,
        userId,
        req.body as CreateConversationInput,
      );
      const body: APIResponse<ConversationDTO> = {
        ok: true,
        data: conversationService.toConversationDTO(row),
      };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/**
 * POST /conversations/:id/archive — "delete this conversation's history" from
 * the user's point of view. Nothing is erased: `messages` has no delete
 * policy at all, so this flips `conversations.archived`, which is what the
 * conversation list already filters on. Saved promos are untouched.
 */
export const archiveConversation: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = contextFor(req);
      const id = req.params.id;
      if (!id) throw AppError.badRequest('Missing conversation id.', 'MISSING_ID');

      const row = await conversationService.archiveConversation(db, id);
      const body: APIResponse<ConversationDTO> = {
        ok: true,
        data: conversationService.toConversationDTO(row),
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

export const listMessages: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const { db } = contextFor(req);
      const id = req.params.id;
      if (!id) throw AppError.badRequest('Missing conversation id.', 'MISSING_ID');

      const rows = await conversationService.listMessages(db, id);
      const body: APIResponse<MessageDTO[]> = {
        ok: true,
        data: rows.map(conversationService.toMessageDTO),
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};
