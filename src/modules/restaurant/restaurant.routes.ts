import { Router } from 'express';
import { RestaurantController } from './restaurant.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { allowRoles } from '../../middleware/roleGuard.middleware';
import { restaurantIsolation } from '../../middleware/restaurantIsolation.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Role } from '../../shared/types/enums';
import {
  createRestaurantSchema,
  updateRestaurantSchema,
  updateStatusSchema,
  createUserSchema,
  createStaffSchema,
  updateStaffSchema,
  updateRestaurantProfileSchema,
} from './restaurant.validator';

const router = Router();
const controller = new RestaurantController();

// ========== SUPER ADMIN - Restaurant Management ==========
router.get('/admin/restaurants', authenticate, allowRoles(Role.SUPER_ADMIN), controller.listRestaurants.bind(controller));
router.post('/admin/restaurants', authenticate, allowRoles(Role.SUPER_ADMIN), validate({ body: createRestaurantSchema }), controller.createRestaurant.bind(controller));
router.get('/admin/restaurants/:id', authenticate, allowRoles(Role.SUPER_ADMIN), controller.getRestaurant.bind(controller));
router.put('/admin/restaurants/:id', authenticate, allowRoles(Role.SUPER_ADMIN), validate({ body: updateRestaurantSchema }), controller.updateRestaurant.bind(controller));
router.patch('/admin/restaurants/:id/status', authenticate, allowRoles(Role.SUPER_ADMIN), validate({ body: updateStatusSchema }), controller.updateStatus.bind(controller));
router.delete('/admin/restaurants/:id', authenticate, allowRoles(Role.SUPER_ADMIN), controller.deleteRestaurant.bind(controller));

// ========== SUPER ADMIN - User Management ==========
router.get('/admin/users', authenticate, allowRoles(Role.SUPER_ADMIN), controller.listUsers.bind(controller));
router.post('/admin/users', authenticate, allowRoles(Role.SUPER_ADMIN), validate({ body: createUserSchema }), controller.createUser.bind(controller));

// ========== SUPER ADMIN - Platform Stats ==========
router.get('/admin/stats', authenticate, allowRoles(Role.SUPER_ADMIN), controller.getPlatformStats.bind(controller));
router.get('/admin/behavior/restaurants', authenticate, allowRoles(Role.SUPER_ADMIN), controller.listBehaviorRestaurants.bind(controller));
router.get('/admin/behavior/restaurants/:id', authenticate, allowRoles(Role.SUPER_ADMIN), controller.getRestaurantBehavior.bind(controller));
router.get('/admin/behavior/restaurants/:id/customers/:customerId/orders', authenticate, allowRoles(Role.SUPER_ADMIN), controller.getCustomerOrderDetails.bind(controller));

// ========== RESTAURANT ADMIN - Profile ==========
router.get('/restaurant/profile', authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation, controller.getProfile.bind(controller));
router.put('/restaurant/profile', authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation, validate({ body: updateRestaurantProfileSchema }), controller.updateProfile.bind(controller));

// ========== RESTAURANT ADMIN - Staff Management ==========
router.get('/restaurant/staff', authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation, controller.listStaff.bind(controller));
router.post('/restaurant/staff', authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation, validate({ body: createStaffSchema }), controller.createStaff.bind(controller));
router.put('/restaurant/staff/:staffId', authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation, validate({ body: updateStaffSchema }), controller.updateStaff.bind(controller));
router.delete('/restaurant/staff/:staffId', authenticate, allowRoles(Role.RESTAURANT_ADMIN), restaurantIsolation, controller.deleteStaff.bind(controller));

export default router;
