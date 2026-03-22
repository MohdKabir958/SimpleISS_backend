import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { JwtPayload } from '../shared/types/interfaces';
import { Role } from '../shared/types/enums';
import { prisma } from '../config/database';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    
    if (decoded.role !== Role.KITCHEN_STAFF && decoded.role !== Role.RESTAURANT_ADMIN) {
      return next(new Error('Unauthorized role'));
    }

    if (!decoded.restaurantId) {
      return next(new Error('Restaurant ID required for kitchen namespace'));
    }

    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
};

export const customerSocketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  const sessionId = socket.handshake.auth.sessionId;

  if (!sessionId) {
    return next(new Error('Session ID required'));
  }

  try {
    // Fast verification to make sure the session is legit
    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true }
    });

    if (!session || session.status !== 'ACTIVE') {
      return next(new Error('Invalid or expired session'));
    }

    socket.data.sessionId = sessionId;
    next();
  } catch (err) {
    next(new Error('Internal server error'));
  }
};
