import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { getRedis } from '../../config/redis';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ConflictError } from '../../shared/errors/ConflictError';
import { SessionStatus } from '../../shared/types/enums';

const SESSION_TTL = 4 * 60 * 60; // 4 hours

export class SessionService {
  /**
   * Called by customer scanning QR code. Creates a new session or returns existing active one.
   */
  async createOrResumeSession(restaurantSlug: string, tableId: string) {
    // 1. Validate restaurant & table
    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurant: { slug: restaurantSlug, isActive: true }, isActive: true },
      include: { restaurant: { select: { id: true, name: true } } },
    });

    if (!table) throw new NotFoundError('Table or Restaurant');

    const restaurantId = table.restaurant.id;

    // 2. Check for active session using Redis first (fast path)
    const redis = getRedis();
    const redisKey = `session:table:${tableId}`;
    
    if (redis) {
      const activeSessionId = await redis.get(redisKey);
      if (activeSessionId) {
        const session = await prisma.tableSession.findUnique({
          where: { id: activeSessionId },
        });

        if (session && session.status === SessionStatus.ACTIVE) {
          return session;
        }
      }
    }

    // 3. Fallback: Check DB for active session
    let session = await prisma.tableSession.findFirst({
      where: { tableId, status: SessionStatus.ACTIVE },
    });

    // 4. Create new session if none exists (unique partial index on ACTIVE per table may race — retry)
    if (!session) {
      try {
        session = await prisma.tableSession.create({
          data: {
            restaurantId,
            tableId,
            status: SessionStatus.ACTIVE,
          },
        });
        logger.info('New table session created', { sessionId: session.id, tableId });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          session = await prisma.tableSession.findFirst({
            where: { tableId, status: SessionStatus.ACTIVE },
          });
          if (!session) throw e;
        } else {
          throw e;
        }
      }
    }

    // 5. Update Redis cache
    if (redis) {
      await redis.setex(redisKey, SESSION_TTL, session.id);
    }

    return session;
  }

  /**
   * Called by Restaurant Admin to forcefully close a session
   */
  async closeSession(restaurantId: string, sessionId: string, status: SessionStatus = SessionStatus.COMPLETED) {
    const session = await prisma.tableSession.findFirst({
      where: { id: sessionId, restaurantId },
    });

    if (!session) throw new NotFoundError('Session');
    if (session.status !== SessionStatus.ACTIVE) {
      throw new ConflictError('Session is already closed');
    }

    const updated = await prisma.tableSession.update({
      where: { id: sessionId },
      data: {
        status,
        closedAt: new Date(),
      },
    });

    // Invalidate cache
    const redis = getRedis();
    if (redis) {
      await redis.del(`session:table:${session.tableId}`);
    }

    logger.info(`Session closed as ${status}`, { sessionId, restaurantId });
    return updated;
  }

  async getSessionStatus(sessionId: string) {
    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true, status: true, startedAt: true, totalAmount: true,
        table: { select: { id: true, tableNumber: true } },
      },
    });

    if (!session) throw new NotFoundError('Session');
    return session;
  }
}
