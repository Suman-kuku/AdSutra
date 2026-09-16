import express, { type Express } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { apiRouter } from './routes/api.router.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  // Skill files arrive as JSON text and may be up to 1 MB; JSON escaping inflates
  // that, so the wire limit sits above the file limit.
  app.use(express.json({ limit: '2mb' }));

  app.use('/', apiRouter);

  // Order matters: unmatched routes become AppErrors, then one handler formats them.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
