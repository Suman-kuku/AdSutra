import type { RequestHandler } from 'express';
import { AppError } from './errorHandler.js';

/** Mount after `requireAuth`. Admins can read everyone's data; creators cannot. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(AppError.unauthorized('Authentication required.', 'NO_SESSION'));
    return;
  }
  if (req.user.role !== 'admin') {
    next(AppError.forbidden('Admin access required.', 'NOT_ADMIN'));
    return;
  }
  next();
};
