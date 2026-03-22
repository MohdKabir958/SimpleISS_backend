import { Router } from 'express';
import { TableController } from './table.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { allowRoles } from '../../middleware/roleGuard.middleware';
import { restaurantIsolation } from '../../middleware/restaurantIsolation.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Role } from '../../shared/types/enums';
import { createTableSchema, updateTableSchema } from './table.validator';

const router = Router();
const c = new TableController();
const admin = [authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation];

router.get('/restaurant/tables', ...admin, c.list.bind(c));
router.post('/restaurant/tables', ...admin, validate({ body: createTableSchema }), c.create.bind(c));
router.put('/restaurant/tables/:tableId', ...admin, validate({ body: updateTableSchema }), c.update.bind(c));
router.delete('/restaurant/tables/:tableId', ...admin, c.remove.bind(c));
router.get('/restaurant/tables/:tableId/session', ...admin, c.getSession.bind(c));

export default router;
