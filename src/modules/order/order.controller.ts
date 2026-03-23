import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OrderService } from './order.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response';
import { OrderStatus } from '../../shared/types/enums';
import { getSocketServer } from '../../socket/socketServer';

const service = new OrderService();

export class OrderController {
  // Public Endpoint
  async placeOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Idempotency: header (standard), or body (Flutter client), else random
      const bodyKey = typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey : undefined;
      const idempotencyKey =
        (req.headers['idempotency-key'] as string | undefined) || bodyKey || uuidv4();
      const sessionId = req.params.sessionId as string;
      const order = await service.placeOrder(sessionId, req.body, idempotencyKey, req.user?.userId);
      
      // Emit socket event to kitchen
      const io = getSocketServer();
      io.of('/kitchen')
        .to(`restaurant_${order.restaurantId}`)
        .emit('new_order', order);
      
      sendCreated(res, order, 'Order placed successfully');
    } catch (e) { next(e); }
  }

  // Public Endpoint
  async getSessionOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.getSessionOrders(req.params.sessionId as string));
    } catch (e) { next(e); }
  }

  // Customer Endpoint
  async getCustomerHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.getCustomerOrderHistory(req.user!.userId));
    } catch (e) { next(e); }
  }

  // Admin / Kitchen Endpoint
  async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as OrderStatus | undefined;
      sendSuccess(res, await service.getRestaurantOrders(req.restaurantId!, status));
    } catch (e) { next(e); }
  }

  // Admin / Kitchen Endpoint
  async getActiveOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.getActiveKitchenOrders(req.restaurantId!));
    } catch (e) { next(e); }
  }

  // Admin / Kitchen Endpoint
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await service.updateOrderStatus(
        req.restaurantId!,
        req.params.orderId as string,
        req.body.status,
        req.user!.userId,
        req.body.rejectionReason
      );
      
      // Customer app listens for `status_update` / `order_ready` (see kitchenHandler + socket_service.dart)
      const io = getSocketServer();
      const customerNs = io.of('/customer');
      const room = `session_${order.sessionId}`;
      const payload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        updatedAt: order.updatedAt,
      };
      customerNs.to(room).emit('status_update', payload);
      if (order.status === OrderStatus.READY) {
        customerNs.to(room).emit('order_ready', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          updatedAt: order.updatedAt,
        });
      }

      sendSuccess(res, order, `Order status updated to ${req.body.status}`);
    } catch (e) { next(e); }
  }
}
