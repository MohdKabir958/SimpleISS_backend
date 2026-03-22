import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { JwtPayload } from '../shared/types/interfaces';
import { AuthenticationError } from '../shared/errors/AuthenticationError';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided', 'AUTH_TOKEN_INVALID');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AuthenticationError('No token provided', 'AUTH_TOKEN_INVALID');
    }

    const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      restaurantId: decoded.restaurantId,
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token has expired', 'AUTH_TOKEN_EXPIRED'));
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token', 'AUTH_TOKEN_INVALID'));
      return;
    }

    next(new AuthenticationError('Authentication failed', 'AUTH_TOKEN_INVALID'));
  }
}
