import { Router } from 'express';
import { ReportController } from './report.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { allowRoles } from '../../middleware/roleGuard.middleware';
import { restaurantIsolation } from '../../middleware/restaurantIsolation.middleware';
import { Role } from '../../shared/types/enums';

const router = Router();
const c = new ReportController();
const admin = [authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation];

router.get('/restaurant/reports/stats', ...admin, c.getStats.bind(c));
router.get('/restaurant/reports/revenue', ...admin, c.getRevenue.bind(c));
router.get('/restaurant/reports/popular-items', ...admin, c.getPopularItems.bind(c));

export default router;
