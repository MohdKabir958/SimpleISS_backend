import { Router } from 'express';
import { MenuController } from './menu.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { allowRoles } from '../../middleware/roleGuard.middleware';
import { restaurantIsolation } from '../../middleware/restaurantIsolation.middleware';
import { validate } from '../../middleware/validate.middleware';
import { upload } from '../../middleware/upload.middleware';
import { Role } from '../../shared/types/enums';
import {
  createCategorySchema, updateCategorySchema, reorderCategorySchema,
  createMenuItemSchema, updateMenuItemSchema, toggleAvailabilitySchema,
} from './menu.validator';

const router = Router();
const c = new MenuController();
const admin = [authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation];

// Categories
router.get('/restaurant/categories', ...admin, c.listCategories.bind(c));
router.post('/restaurant/categories', ...admin, validate({ body: createCategorySchema }), c.createCategory.bind(c));
router.put('/restaurant/categories/:catId', ...admin, validate({ body: updateCategorySchema }), c.updateCategory.bind(c));
router.patch('/restaurant/categories/:catId/reorder', ...admin, validate({ body: reorderCategorySchema }), c.reorderCategory.bind(c));
router.delete('/restaurant/categories/:catId', ...admin, c.deleteCategory.bind(c));

// Menu Items
router.get('/restaurant/items', ...admin, c.listItems.bind(c));
router.post('/restaurant/items', ...admin, upload.single('image'), c.createItem.bind(c));
router.get('/restaurant/items/:itemId', ...admin, c.getItem.bind(c));
router.put('/restaurant/items/:itemId', ...admin, upload.single('image'), c.updateItem.bind(c));
router.patch('/restaurant/items/:itemId/availability', ...admin, validate({ body: toggleAvailabilitySchema }), c.toggleAvailability.bind(c));
router.delete('/restaurant/items/:itemId', ...admin, c.deleteItem.bind(c));

// Public Menu
router.get('/public/r/:slug/t/:tableId/menu', c.getPublicMenu.bind(c));

export default router;
