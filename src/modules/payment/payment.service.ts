import { prisma } from '../../config/database';
import { getRedis } from '../../config/redis';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ConflictError } from '../../shared/errors/ConflictError';
import { PaymentStatus, SessionStatus } from '../../shared/types/enums';
import { RequestBillInput } from './payment.validator';

export class PaymentService {
  async requestBill(sessionId: string, input: RequestBillInput) {
    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: { orders: true, payment: true },
    });

    if (!session) throw new NotFoundError('Session');
    
    // Check if any orders are uncompleted
    const incompleteOrders = session.orders.filter(
      (o: any) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(o.status)
    );

    if (incompleteOrders.length > 0) {
      throw new ConflictError('Cannot request bill with incomplete orders. Wait for all orders to be served or cancelled.');
    }

    if (session.payment) {
      if (session.payment.status === PaymentStatus.COMPLETED) {
        throw new ConflictError('Payment already completed for this session');
      }
      return session.payment;
    }

    // Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        sessionId,
        restaurantId: session.restaurantId,
        totalAmount: session.totalAmount,
        method: input.paymentMethod,
        status: PaymentStatus.PENDING,
      },
    });

    logger.info('Bill requested', { sessionId, paymentId: payment.id });
    return payment;
  }

  async getRestaurantPayments(restaurantId: string) {
    return prisma.payment.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          select: { table: { select: { tableNumber: true } } },
        },
      },
    });
  }

  async completePayment(restaurantId: string, paymentId: string, method: string) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, restaurantId },
      include: { session: true },
    });

    if (!payment) throw new NotFoundError('Payment');
    if (payment.status === PaymentStatus.COMPLETED) {
      throw new ConflictError('Payment is already completed');
    }

    // Update payment and close session in a transaction
    return prisma.$transaction(async (tx: any) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          method: method as any,
          paidAt: new Date(),
        },
      });

      await tx.tableSession.update({
        where: { id: payment.sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          closedAt: new Date(),
        },
      });

      // Clear cache
      const redis = getRedis();
      if (redis) {
        await redis.del(`session:table:${payment.session.tableId}`);
      }

      logger.info('Payment completed and session closed', { paymentId, sessionId: payment.sessionId });
      return updatedPayment;
    });
  }
}
