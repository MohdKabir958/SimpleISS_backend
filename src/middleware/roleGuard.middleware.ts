import { Request, Response, NextFunction } from 'express';
import { Role } from '../shared/types/enums';
import { AuthorizationError } from '../shared/errors/AuthorizationError';

export function allowRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthorizationError());
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      next(new AuthorizationError());
      return;
    }

    next();
  };
}
