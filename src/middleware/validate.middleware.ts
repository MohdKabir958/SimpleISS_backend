import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../shared/errors/ValidationError';

interface ValidationSchemas {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as Record<string, string>;
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as Record<string, string>;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        // Zod 3+ uses `issues` (not `.errors`)
        for (const err of error.issues) {
          const path = err.path.length ? err.path.join('.') : '_root';
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(err.message);
        }

        next(new ValidationError('Validation failed', { fields: details }));
        return;
      }
      next(error);
    }
  };
}
