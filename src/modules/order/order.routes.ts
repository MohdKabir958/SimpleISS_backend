import { Router } from 'express';
import { OrderController } from './order.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { allowRoles } from '../../middleware/roleGuard.middleware';
import { restaurantIsolation } from '../../middleware/restaurantIsolation.middleware';
import { validate } from '../../middleware/validate.middleware';
import { orderLimiter } from '../../middleware/rateLimiter.middleware';
import { Role } from '../../shared/types/enums';
import { placeOrderSchema, updateOrderStatusSchema } from './order.validator';

const router = Router();
const c = new OrderController();

// Public Order Placement
router.post(
  '/public/session/:sessionId/order',
  orderLimiter,
  validate({ body: placeOrderSchema }),
  c.placeOrder.bind(c)
);

// Public View Orders
router.get('/public/session/:sessionId/orders', c.getSessionOrders.bind(c));

// Admin & Kitchen Routes
const staff = [authenticate, allowRoles(Role.RESTAURANT_ADMIN, Role.KITCHEN_STAFF), restaurantIsolation];

router.get('/restaurant/orders', ...staff, c.getOrders.bind(c));
router.get('/restaurant/orders/active', ...staff, c.getActiveOrders.bind(c));
router.patch(
  '/restaurant/orders/:orderId/status',
  ...staff,
  validate({ body: updateOrderStatusSchema }),
  c.updateStatus.bind(c)
);

export default router;
