import { Request, Response, NextFunction } from 'express';
import { RestaurantService } from './restaurant.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/response';
import { extractPagination } from '../../shared/utils/pagination';

const service = new RestaurantService();

export class RestaurantController {
  // ========== SUPER ADMIN ==========

  async listRestaurants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = extractPagination(req);
      const { data, total } = await service.listRestaurants(pagination, true);
      sendPaginated(res, data, { page: pagination.page, limit: pagination.limit, total });
    } catch (error) { next(error); }
  }

  async getRestaurant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurant = await service.getRestaurantById(req.params.id as string);
      sendSuccess(res, restaurant);
    } catch (error) { next(error); }
  }

  async createRestaurant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurant = await service.createRestaurant(req.body);
      sendCreated(res, restaurant, 'Restaurant created successfully');
    } catch (error) { next(error); }
  }

  async updateRestaurant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurant = await service.updateRestaurant(req.params.id as string, req.body);
      sendSuccess(res, restaurant, 'Restaurant updated successfully');
    } catch (error) { next(error); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurant = await service.updateRestaurantStatus(req.params.id as string, req.body.isActive);
      sendSuccess(res, restaurant, `Restaurant ${req.body.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) { next(error); }
  }

  async deleteRestaurant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await service.deleteRestaurant(req.params.id as string);
      sendSuccess(res, null, 'Restaurant deleted successfully');
    } catch (error) { next(error); }
  }

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = extractPagination(req);
      const { data, total } = await service.listUsers(pagination);
      sendPaginated(res, data, { page: pagination.page, limit: pagination.limit, total });
    } catch (error) { next(error); }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await service.createUser(req.body);
      sendCreated(res, user, 'User created successfully');
    } catch (error) { next(error); }
  }

  // ========== RESTAURANT ADMIN ==========

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await service.getProfile(req.restaurantId!);
      sendSuccess(res, profile);
    } catch (error) { next(error); }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await service.updateProfile(req.restaurantId!, req.body);
      sendSuccess(res, profile, 'Profile updated successfully');
    } catch (error) { next(error); }
  }

  async listStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staff = await service.listStaff(req.restaurantId!);
      sendSuccess(res, staff);
    } catch (error) { next(error); }
  }

  async createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staff = await service.createStaff(req.restaurantId!, req.body);
      sendCreated(res, staff, 'Staff member created successfully');
    } catch (error) { next(error); }
  }

  async updateStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staff = await service.updateStaff(req.restaurantId!, req.params.staffId as string, req.body);
      sendSuccess(res, staff, 'Staff updated successfully');
    } catch (error) { next(error); }
  }

  async deleteStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await service.deleteStaff(req.restaurantId!, req.params.staffId as string);
      sendSuccess(res, null, 'Staff member removed');
    } catch (error) { next(error); }
  }

  // ========== SUPER ADMIN - Platform Stats ==========

  async getPlatformStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await service.getPlatformStats();
      sendSuccess(res, stats);
    } catch (error) { next(error); }
  }
}
