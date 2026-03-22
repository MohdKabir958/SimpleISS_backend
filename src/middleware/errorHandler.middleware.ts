import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError';
import { sendError } from '../shared/utils/response';
import { logger } from '../config/logger';
import { config } from '../config/env';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.code} - ${err.message}`, {
      statusCode: err.statusCode,
      code: err.code,
      path: req.path,
      method: req.method,
      ...(config.isDev && { stack: err.stack }),
    });

    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // Unexpected error
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    config.isProd ? 'An unexpected error occurred' : err.message
  );
}
