import { Router } from 'express';
import { QrcodeController } from './qrcode.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { allowRoles } from '../../middleware/roleGuard.middleware';
import { restaurantIsolation } from '../../middleware/restaurantIsolation.middleware';
import { Role } from '../../shared/types/enums';

const router = Router();
const c = new QrcodeController();
const admin = [authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation];

router.get('/restaurant/tables/:tableId/qr/download', ...admin, c.downloadForTable.bind(c));
router.get('/restaurant/qr/all', ...admin, c.getAllForRestaurant.bind(c));

export default router;
