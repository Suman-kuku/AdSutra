import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from './errorHandler.js';

/**
 * Validates `req.body` against a shared Zod schema and replaces it with the
 * parsed result, so controllers receive already-trimmed, typed input.
 */
export function validateBody(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');
      next(AppError.badRequest(detail, 'VALIDATION_FAILED'));
      return;
    }
    req.body = parsed.data;
    next();
  };
}
