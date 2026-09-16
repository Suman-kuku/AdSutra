import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { APIResponse } from '@scriptcraft/shared';
import { isProduction } from '../config/env.js';

/**
 * The only error type controllers and services should throw. Everything else
 * that reaches the handler is treated as an unexpected 500.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message: string, code = 'BAD_REQUEST'): AppError {
    return new AppError(400, code, message);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED'): AppError {
    return new AppError(401, code, message);
  }

  static forbidden(message = 'Not allowed', code = 'FORBIDDEN'): AppError {
    return new AppError(403, code, message);
  }

  static notFound(message = 'Not found', code = 'NOT_FOUND'): AppError {
    return new AppError(404, code, message);
  }

  static conflict(message: string, code = 'CONFLICT'): AppError {
    return new AppError(409, code, message);
  }

  static internal(message = 'Something went wrong', code = 'INTERNAL_ERROR'): AppError {
    return new AppError(500, code, message);
  }
}

/** 404 fallback — mounted after all routes, before the error handler. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`No route for ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
};

/**
 * The single place errors become responses. Stack traces are logged, never sent.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isApp = err instanceof AppError;
  const statusCode = isApp ? err.statusCode : 500;
  const code = isApp ? err.code : 'INTERNAL_ERROR';

  // Unexpected errors keep their detail in the logs only.
  const message = isApp
    ? err.message
    : isProduction
      ? 'Something went wrong'
      : err instanceof Error
        ? err.message
        : 'Something went wrong';

  if (!isApp || statusCode >= 500) {
    console.error('[error]', err);
  }

  const body: APIResponse<never> = { ok: false, error: { code, message } };
  res.status(statusCode).json(body);
};
