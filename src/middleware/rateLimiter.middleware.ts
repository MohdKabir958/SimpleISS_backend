import rateLimit, { ipKeyGenerator, Options } from 'express-rate-limit';
import { Request, Response } from 'express';

/** Fresh timestamp on every 429 response (BUG-5: avoid static module-load time). */
function rateLimitJsonHandler(
  message: string,
  code: string,
): Options['handler'] {
  return (req: Request, res: Response, _next: unknown, options: { statusCode: number }) => {
    res.status(options.statusCode).json({
      success: false,
      error: {
        code,
        message,
        statusCode: options.statusCode,
      },
      timestamp: new Date().toISOString(),
    });
  };
}

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJsonHandler(
    'Too many requests, please try again later',
    'RATE_LIMIT_EXCEEDED',
  ),
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJsonHandler(
    'Too many authentication attempts, please try again later',
    'RATE_LIMIT_EXCEEDED',
  ),
});

export const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.params.sessionId as string) || ipKeyGenerator(req.ip || 'unknown'),
  handler: rateLimitJsonHandler(
    'Too many order attempts, please wait before trying again',
    'RATE_LIMIT_EXCEEDED',
  ),
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJsonHandler(
    'Too many uploads, please try again later',
    'RATE_LIMIT_EXCEEDED',
  ),
});
