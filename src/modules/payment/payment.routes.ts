import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { allowRoles } from '../../middleware/roleGuard.middleware';
import { restaurantIsolation } from '../../middleware/restaurantIsolation.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Role } from '../../shared/types/enums';
import { requestBillSchema, completePaymentSchema } from './payment.validator';

const router = Router();
const c = new PaymentController();

// Public
router.post('/public/session/:sessionId/bill', validate({ body: requestBillSchema }), c.requestBill.bind(c));

// Admin
const admin = [authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation];

router.get('/restaurant/payments', ...admin, c.listPayments.bind(c));
router.patch('/restaurant/payments/:paymentId/complete', ...admin, validate({ body: completePaymentSchema }), c.completePayment.bind(c));

export default router;
