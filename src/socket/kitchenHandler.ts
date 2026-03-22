import { Server, Socket } from 'socket.io';
import { logger } from '../config/logger';
import { OrderService } from '../modules/order/order.service';
import { OrderStatus } from '../shared/types/enums';

const orderService = new OrderService();

export const setupKitchenHandlers = (io: Server, socket: Socket) => {
  const user = socket.data.user;
  const restaurantId = user.restaurantId;

  // Kitchen wants to update order status
  socket.on('update_status', async (payload: { orderId: string, newStatus: OrderStatus, rejectionReason?: string }, callback) => {
    try {
      const { orderId, newStatus, rejectionReason } = payload;
      
      const order = await orderService.updateOrderStatus(
        restaurantId,
        orderId,
        newStatus,
        user.userId,
        rejectionReason
      );

      // Successfully updated in DB, now broadcast to other kitchen staff
      socket.to(`restaurant_${restaurantId}`).emit('order_status_updated', {
        orderId,
        status: newStatus,
        updatedAt: order.updatedAt,
      });

      // Notify the customer directly
      io.of('/customer').to(`session_${order.sessionId}`).emit('status_update', {
        orderId,
        orderNumber: order.orderNumber,
        status: newStatus,
        updatedAt: order.updatedAt,
      });

      if (callback) callback({ success: true, order });
    } catch (error: any) {
      logger.error('Socket update_status failed', { error: error.message, orderId: payload.orderId });
      if (callback) callback({ success: false, error: error.message });
    }
  });
};
