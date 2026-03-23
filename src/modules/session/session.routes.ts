import { Router } from 'express';
import { SessionController } from './session.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { allowRoles } from '../../middleware/roleGuard.middleware';
import { restaurantIsolation } from '../../middleware/restaurantIsolation.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Role } from '../../shared/types/enums';
import { closeSessionSchema } from './session.validator';

import { completePaymentSchema } from '../payment/payment.validator';

const router = Router();
const c = new SessionController();

// Public
router.post('/public/r/:slug/t/:tableId/session', c.createOrResume.bind(c));
router.get('/public/session/:sessionId/status', c.getStatus.bind(c));

// Admin
const admin = [authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation];

router.get('/restaurant/sessions/active', ...admin, c.getActiveSessions.bind(c));

router.patch(
  '/restaurant/sessions/:sessionId/complete-payment',
  ...admin,
  validate({ body: completePaymentSchema }),
  c.completePayment.bind(c)
);

router.patch(
  '/restaurant/sessions/:sessionId/close',
  ...admin,
  validate({ body: closeSessionSchema }),
  c.closeSession.bind(c)
);

export default router;
