import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { getRedis } from '../../config/redis';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ConflictError } from '../../shared/errors/ConflictError';
import { SessionStatus } from '../../shared/types/enums';

const SESSION_TTL = 4 * 60 * 60; // 4 hours

export class SessionService {
  async getActiveSessions(restaurantId: string) {
    const sessions = await prisma.tableSession.findMany({
      where: { restaurantId, status: SessionStatus.ACTIVE },
      include: {
        table: {
          select: {
            id: true,
            restaurantId: true,
            tableNumber: true,
            capacity: true,
            qrCodeUrl: true,
            isActive: true,
          },
        },
        orders: { orderBy: { createdAt: 'desc' } },
        payment: { select: { status: true, id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s: any) => {
      const hasPendingPayment = Array.isArray(s.payment)
        ? s.payment.some((p: any) => p.status === 'PENDING')
        : s.payment?.status === 'PENDING';
        
      // Ensure 'orders' is mapped to prevent missing property errors in frontend
      return {
        ...s,
        status: hasPendingPayment ? 'bill_requested' : s.status,
      };
    });
  }

  async completePaymentBySession(restaurantId: string, sessionId: string, method: string) {
    const payment = await prisma.payment.findFirst({
      where: { sessionId, restaurantId, status: 'PENDING' },
    });

    if (!payment) throw new NotFoundError('Pending Payment not found for this session');

    return prisma.$transaction(async (tx: any) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          method: method as any,
          paidAt: new Date(),
        },
      });

      await tx.tableSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          closedAt: new Date(),
        },
      });

      const redis = getRedis();
      if (redis) {
        const session = await tx.tableSession.findUnique({ where: { id: sessionId } });
        if (session) await redis.del(`session:table:${session.tableId}`);
      }

      logger.info('Payment completed via session ID', { sessionId });
      return updatedPayment;
    });
  }

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
