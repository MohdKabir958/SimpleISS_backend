import crypto from 'crypto';
import { prisma } from '../../config/database';
import { getRedis } from '../../config/redis';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { AppError } from '../../shared/errors/AppError';
import { ConflictError } from '../../shared/errors/ConflictError';
import { OrderStatus, SessionStatus, ORDER_STATUS_TRANSITIONS } from '../../shared/types/enums';
import { PlaceOrderInput } from './order.validator';

export class OrderService {
  async placeOrder(sessionId: string, input: PlaceOrderInput, idempotencyKey: string, customerId?: string) {
    // 1. Idempotency Check
    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey },
      include: { items: true },
    });
    if (existingOrder) return existingOrder;

    // 2. Load session
    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundError('Session');
    if (session.status !== SessionStatus.ACTIVE) {
      throw new ConflictError('Cannot place order on a closed session');
    }

    // 3. Begin Transaction
    return prisma.$transaction(async (tx: any) => {
      let totalAmount = 0;
      const orderItemsToCreate = [];

      // Validate pricing and availability
      for (const item of input.items) {
        const menuItem = await tx.menuItem.findFirst({
          where: { id: item.menuItemId, restaurantId: session.restaurantId },
        });

        if (!menuItem) throw new NotFoundError(`Menu item ${item.menuItemId}`);
        if (!menuItem.isAvailable) throw new ConflictError(`Item ${menuItem.name} is currently unavailable`);

        const lineTotal = Number(menuItem.price) * item.quantity;
        totalAmount += lineTotal;

        orderItemsToCreate.push({
          menuItemId: menuItem.id,
          itemName: menuItem.name,
          itemPrice: menuItem.price,
          quantity: item.quantity,
          notes: item.notes,
        });
      }

      // 4. Generate Order Number
      const orderNumber = await this.generateOrderNumber(session.restaurantId);

      const statusHistory = [{ status: OrderStatus.PLACED, timestamp: new Date().toISOString(), changedBy: 'CUSTOMER' }];

      // 5. Create Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          sessionId,
          restaurantId: session.restaurantId,
          tableId: session.tableId,
          customerId,
          status: OrderStatus.PLACED,
          totalAmount,
          notes: input.notes,
          idempotencyKey,
          statusHistory: JSON.stringify(statusHistory),
          items: {
            create: orderItemsToCreate,
          },
        },
        include: { items: true, table: { select: { tableNumber: true } } },
      });

      // 6. Update Session Total
      await tx.tableSession.update({
        where: { id: sessionId },
        data: { totalAmount: { increment: totalAmount } },
      });

      logger.info('Order placed successfully', { orderId: order.id, orderNumber });
      return order;
    });
  }

  async getSessionOrders(sessionId: string) {
    return prisma.order.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async getCustomerOrderHistory(customerId: string) {
    return prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        restaurant: { select: { id: true, name: true, slug: true } },
        table: { select: { id: true, tableNumber: true } },
      },
    });
  }

  async getRestaurantOrders(restaurantId: string, status?: OrderStatus) {
    return prisma.order.findMany({
      where: status ? { restaurantId, status } : { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        table: { select: { tableNumber: true } },
      },
    });
  }

  async getActiveKitchenOrders(restaurantId: string) {
    return prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: [OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY] },
      },
      orderBy: { placedAt: 'asc' },
      include: {
        items: true,
        table: { select: { tableNumber: true } },
      },
    });
  }

  async updateOrderStatus(restaurantId: string, orderId: string, newStatus: OrderStatus, changedBy: string, rejectionReason?: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundError('Order');

    // Validate Transition
    const allowedNext = ORDER_STATUS_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(newStatus)) {
      throw new ConflictError(`Cannot transition order from ${order.status} to ${newStatus}`);
    }

    if (newStatus === OrderStatus.REJECTED && !rejectionReason) {
      throw new AppError('Rejection reason is required', 400, 'REASON_REQUIRED');
    }

    const history = JSON.parse(order.statusHistory);
    history.push({ status: newStatus, timestamp: new Date().toISOString(), changedBy });

    const updateData: any = {
      status: newStatus,
      statusHistory: JSON.stringify(history),
    };

    if (newStatus === OrderStatus.ACCEPTED) updateData.acceptedAt = new Date();
    // preparedAt = kitchen finished prep (same moment order is ready for pickup); not when PREPARING starts
    if (newStatus === OrderStatus.READY) {
      updateData.readyAt = new Date();
      updateData.preparedAt = new Date();
    }
    if (newStatus === OrderStatus.SERVED) updateData.servedAt = new Date();
    if (newStatus === OrderStatus.COMPLETED) updateData.completedAt = new Date();
    if (newStatus === OrderStatus.REJECTED) updateData.rejectionReason = rejectionReason;

    // Transaction to update order and revert session total if rejected/cancelled
    return prisma.$transaction(async (tx: any) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: { items: true, table: { select: { tableNumber: true } } },
      });

      if (newStatus === OrderStatus.REJECTED || newStatus === OrderStatus.CANCELLED) {
        await tx.tableSession.update({
          where: { id: order.sessionId },
          data: { totalAmount: { decrement: order.totalAmount } },
        });
      }

      logger.info(`Order ${order.orderNumber} status changed to ${newStatus}`, { orderId, restaurantId });
      return updatedOrder;
    });
  }

  private async generateOrderNumber(restaurantId: string): Promise<string> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { orderPrefix: true },
    });
    
    const prefix = restaurant?.orderPrefix || 'ORD';
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // Use Redis for atomic sequence if available
    const redis = getRedis();
    if (redis) {
      const key = `orderseq:${restaurantId}:${date}`;
      const seq = await redis.incr(key);
      await redis.expire(key, 24 * 60 * 60); // 24h expiration
      return `${prefix}-${date}-${seq.toString().padStart(4, '0')}`;
    }

    // Fallback: Date + random 4 chars for dev fallback
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}-${date}-${random}`;
  }
}
