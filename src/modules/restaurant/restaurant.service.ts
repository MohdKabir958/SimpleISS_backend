import bcrypt from 'bcrypt';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ConflictError } from '../../shared/errors/ConflictError';
import { AppError } from '../../shared/errors/AppError';
import {
  CreateRestaurantInput,
  UpdateRestaurantInput,
  CreateUserInput,
  CreateStaffInput,
  UpdateStaffInput,
  UpdateRestaurantProfileInput,
} from './restaurant.validator';
import { PaginationParams } from '../../shared/types/interfaces';
import { getPrismaSkipTake } from '../../shared/utils/pagination';

export class RestaurantService {
  // ========== SUPER ADMIN - Restaurant CRUD ==========

  async listRestaurants(pagination: PaginationParams, includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const { skip, take } = getPrismaSkipTake(pagination);

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        skip,
        take,
        orderBy: { [pagination.sort]: pagination.order },
        include: {
          _count: { select: { tables: true, orders: true, users: true } },
          users: {
            where: { role: 'RESTAURANT_ADMIN' },
            take: 1,
            select: { name: true, email: true },
          },
        },
      }),
      prisma.restaurant.count({ where }),
    ]);

    // Map first RESTAURANT_ADMIN user as owner for each restaurant
    const data = restaurants.map((r) => {
      const { users, ...rest } = r;
      const owner = Array.isArray(users) && users.length > 0 ? users[0] : null;
      return { ...rest, owner };
    });

    return { data, total };
  }

  async getRestaurantById(id: string) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        _count: { select: { tables: true, orders: true, users: true, menuItems: true, menuCategories: true } },
      },
    });

    if (!restaurant) throw new NotFoundError('Restaurant');
    return restaurant;
  }

  async createRestaurant(input: CreateRestaurantInput) {
    const existing = await prisma.restaurant.findUnique({ where: { slug: input.slug } });
    if (existing) throw new ConflictError('Restaurant with this slug already exists', 'RESTAURANT_SLUG_EXISTS');

    const restaurant = await prisma.restaurant.create({ data: input });
    logger.info('Restaurant created', { restaurantId: restaurant.id, name: restaurant.name });
    return restaurant;
  }

  async updateRestaurant(id: string, input: UpdateRestaurantInput) {
    const existing = await prisma.restaurant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Restaurant');

    if (input.slug && input.slug !== existing.slug) {
      const slugExists = await prisma.restaurant.findUnique({ where: { slug: input.slug } });
      if (slugExists) throw new ConflictError('Slug already in use', 'RESTAURANT_SLUG_EXISTS');
    }

    const restaurant = await prisma.restaurant.update({ where: { id }, data: input });
    logger.info('Restaurant updated', { restaurantId: id });
    return restaurant;
  }

  async updateRestaurantStatus(id: string, isActive: boolean) {
    const existing = await prisma.restaurant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Restaurant');

    const restaurant = await prisma.restaurant.update({ where: { id }, data: { isActive } });
    logger.info(`Restaurant ${isActive ? 'activated' : 'deactivated'}`, { restaurantId: id });
    return restaurant;
  }

  async deleteRestaurant(id: string) {
    const existing = await prisma.restaurant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Restaurant');

    // Soft delete
    await prisma.restaurant.update({ where: { id }, data: { isActive: false } });
    logger.info('Restaurant soft-deleted', { restaurantId: id });
  }

  // ========== SUPER ADMIN - User Management ==========

  async listUsers(pagination: PaginationParams) {
    const { skip, take } = getPrismaSkipTake(pagination);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        orderBy: { [pagination.sort]: pagination.order },
        select: {
          id: true, email: true, name: true, role: true,
          restaurantId: true, isActive: true, createdAt: true,
          restaurant: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.user.count(),
    ]);

    return { data: users, total };
  }

  async createUser(input: CreateUserInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError('Email already registered', 'USER_EMAIL_EXISTS');

    const restaurant = await prisma.restaurant.findUnique({ where: { id: input.restaurantId } });
    if (!restaurant) throw new NotFoundError('Restaurant');

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: input.role,
        restaurantId: input.restaurantId,
      },
      select: {
        id: true, email: true, name: true, role: true,
        restaurantId: true, isActive: true, createdAt: true,
      },
    });

    logger.info('User created', { userId: user.id, role: user.role });
    return user;
  }

  // ========== RESTAURANT ADMIN - Profile ==========

  async getProfile(restaurantId: string) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { _count: { select: { tables: true, menuItems: true, menuCategories: true } } },
    });

    if (!restaurant) throw new NotFoundError('Restaurant');
    return restaurant;
  }

  async updateProfile(restaurantId: string, input: UpdateRestaurantProfileInput) {
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: input,
    });

    logger.info('Restaurant profile updated', { restaurantId });
    return restaurant;
  }

  // ========== RESTAURANT ADMIN - Staff Management ==========

  async listStaff(restaurantId: string) {
    return prisma.user.findMany({
      where: { restaurantId, role: 'KITCHEN_STAFF' },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaff(restaurantId: string, input: CreateStaffInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError('Email already registered', 'USER_EMAIL_EXISTS');

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const staff = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: 'KITCHEN_STAFF',
        restaurantId,
      },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true,
      },
    });

    logger.info('Kitchen staff created', { staffId: staff.id, restaurantId });
    return staff;
  }

  async updateStaff(restaurantId: string, staffId: string, input: UpdateStaffInput) {
    const staff = await prisma.user.findFirst({
      where: { id: staffId, restaurantId, role: 'KITCHEN_STAFF' },
    });

    if (!staff) throw new NotFoundError('Staff member');

    if (input.email && input.email !== staff.email) {
      const emailExists = await prisma.user.findUnique({ where: { email: input.email } });
      if (emailExists) throw new ConflictError('Email already in use', 'USER_EMAIL_EXISTS');
    }

    const updated = await prisma.user.update({
      where: { id: staffId },
      data: input,
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true,
      },
    });

    logger.info('Staff updated', { staffId, restaurantId });
    return updated;
  }

  async deleteStaff(restaurantId: string, staffId: string) {
    const staff = await prisma.user.findFirst({
      where: { id: staffId, restaurantId, role: 'KITCHEN_STAFF' },
    });

    if (!staff) throw new NotFoundError('Staff member');

    // Soft delete
    await prisma.user.update({ where: { id: staffId }, data: { isActive: false } });
    logger.info('Staff soft-deleted', { staffId, restaurantId });
  }

  // ========== SUPER ADMIN - Platform Stats ==========

  async getPlatformStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      totalRestaurants,
      activeRestaurants,
      totalUsers,
      totalOrders,
      todayOrders,
      totalRevenueAgg,
      todayRevenueAgg,
      topPerforming,
      monthlyRevenueRows,
      monthlyOrderRows,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: today } },
        _sum: { totalAmount: true },
      }),
      // Top performing restaurants
      prisma.restaurant.findMany({
        take: 5,
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          _count: { select: { orders: true } },
          orders: {
            where: { status: 'COMPLETED' },
            select: { totalAmount: true }
          }
        },
      }),
      // Monthly revenue: aggregate by calendar month (not per-row createdAt)
      prisma.$queryRaw<Array<{ month: Date; total: unknown }>>`
        SELECT date_trunc('month', "createdAt") AS month, COALESCE(SUM("totalAmount"), 0)::float AS total
        FROM "Payment"
        WHERE status = 'COMPLETED' AND "createdAt" >= ${sixMonthsAgo}
        GROUP BY date_trunc('month', "createdAt")
        ORDER BY month ASC
      `,
      prisma.$queryRaw<Array<{ month: Date; cnt: unknown }>>`
        SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::int AS cnt
        FROM "Order"
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY date_trunc('month', "createdAt")
        ORDER BY month ASC
      `,
    ]);

    // Format top performing restaurants
    const topPerformingRestaurants = topPerforming.map(r => ({
      id: r.id,
      name: r.name,
      orders: r._count.orders,
      revenue: r.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
    })).sort((a, b) => b.revenue - a.revenue);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthKeysOrdered: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      monthKeysOrdered.push(monthKey(d));
    }

    const revenueByKey: Record<string, number> = {};
    const ordersByKey: Record<string, number> = {};
    monthKeysOrdered.forEach((k) => {
      revenueByKey[k] = 0;
      ordersByKey[k] = 0;
    });

    monthlyRevenueRows.forEach((row) => {
      const d = new Date(row.month);
      const k = monthKey(d);
      if (revenueByKey[k] !== undefined) {
        revenueByKey[k] = Number(row.total);
      }
    });

    monthlyOrderRows.forEach((row) => {
      const d = new Date(row.month);
      const k = monthKey(d);
      if (ordersByKey[k] !== undefined) {
        ordersByKey[k] = Number(row.cnt);
      }
    });

    const labelForKey = (key: string) => {
      const [y, m] = key.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    };

    const formattedRevenueTrend = monthKeysOrdered.map((k) => ({ month: labelForKey(k), amount: revenueByKey[k] }));
    const formattedOrdersTrend = monthKeysOrdered.map((k) => ({ month: labelForKey(k), count: ordersByKey[k] }));

    return {
      totalRestaurants,
      activeRestaurants,
      totalUsers,
      totalOrders,
      todayOrders,
      totalRevenue: Number(totalRevenueAgg._sum.totalAmount || 0),
      todayRevenue: Number(todayRevenueAgg._sum.totalAmount || 0),
      topPerformingRestaurants,
      revenueTrend: formattedRevenueTrend,
      ordersTrend: formattedOrdersTrend,
    };
  }
}
