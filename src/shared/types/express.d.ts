import { Request } from 'express';
import { JwtPayload } from './interfaces';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      restaurantId?: string;
    }
  }
}
