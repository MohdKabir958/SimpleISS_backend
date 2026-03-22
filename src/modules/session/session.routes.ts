import { Router } from 'express';
import { SessionController } from './session.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { allowRoles } from '../../middleware/roleGuard.middleware';
import { restaurantIsolation } from '../../middleware/restaurantIsolation.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Role } from '../../shared/types/enums';
import { closeSessionSchema } from './session.validator';

const router = Router();
const c = new SessionController();

// Public
router.post('/public/r/:slug/t/:tableId/session', c.createOrResume.bind(c));
router.get('/public/session/:sessionId/status', c.getStatus.bind(c));

// Admin
router.patch(
  '/restaurant/sessions/:sessionId/close',
  authenticate,
  allowRoles(Role.RESTAURANT_ADMIN),
  restaurantIsolation,
  validate({ body: closeSessionSchema }),
  c.closeSession.bind(c)
);

export default router;
