import { Request, Response, NextFunction } from 'express';
import { Role } from '../shared/types/enums';
import { AuthorizationError } from '../shared/errors/AuthorizationError';

/**
 * CRITICAL: Multi-tenant data isolation middleware.
 *
 * Extracts restaurantId from the JWT token (for Restaurant Admin & Kitchen Staff)
 * or from URL params (for Super Admin). NEVER trusts restaurantId from request body
 * or query params for data filtering.
 */
export function restaurantIsolation(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AuthorizationError());
    return;
  }

  const { role, restaurantId } = req.user;

  if (role === Role.SUPER_ADMIN) {
    // Super Admin can access any restaurant — use URL param if provided
    const paramRestaurantId = req.params.restaurantId || req.params.id;
    if (paramRestaurantId) {
      req.restaurantId = paramRestaurantId as string;
    }
    next();
    return;
  }

  if (role === Role.RESTAURANT_ADMIN || role === Role.KITCHEN_STAFF) {
    if (!restaurantId) {
      next(new AuthorizationError('User is not associated with any restaurant'));
      return;
    }

    // ALWAYS use restaurantId from JWT, never from request
    req.restaurantId = restaurantId;
    next();
    return;
  }

  next(new AuthorizationError());
}
