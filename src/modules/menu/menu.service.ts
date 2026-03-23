import { prisma } from '../../config/database';
import { getRedis } from '../../config/redis';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ConflictError } from '../../shared/errors/ConflictError';
import { CreateCategoryInput, CreateMenuItemInput, UpdateMenuItemInput } from './menu.validator';

const MENU_CACHE_TTL = 30 * 60; // 30 minutes

export class MenuService {
  // ========== Categories ==========

  async listCategories(restaurantId: string) {
    return prisma.menuCategory.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async createCategory(restaurantId: string, input: CreateCategoryInput) {
    const existing = await prisma.menuCategory.findUnique({
      where: { restaurantId_name: { restaurantId, name: input.name } },
    });
    if (existing) throw new ConflictError('Category with this name already exists');

    const category = await prisma.menuCategory.create({
      data: { ...input, restaurantId },
    });

    await this.invalidateMenuCache(restaurantId);
    logger.info('Category created', { categoryId: category.id, restaurantId });
    return category;
  }

  async updateCategory(restaurantId: string, catId: string, input: Partial<CreateCategoryInput>) {
    const category = await prisma.menuCategory.findFirst({ where: { id: catId, restaurantId } });
    if (!category) throw new NotFoundError('Category');

    if (input.name && input.name !== category.name) {
      const nameExists = await prisma.menuCategory.findUnique({
        where: { restaurantId_name: { restaurantId, name: input.name } },
      });
      if (nameExists) throw new ConflictError('Category name already exists');
    }

    const updated = await prisma.menuCategory.update({ where: { id: catId }, data: input });
    await this.invalidateMenuCache(restaurantId);
    return updated;
  }

  async reorderCategory(restaurantId: string, catId: string, sortOrder: number) {
    const category = await prisma.menuCategory.findFirst({ where: { id: catId, restaurantId } });
    if (!category) throw new NotFoundError('Category');

    const updated = await prisma.menuCategory.update({ where: { id: catId }, data: { sortOrder } });
    await this.invalidateMenuCache(restaurantId);
    return updated;
  }

  async deleteCategory(restaurantId: string, catId: string) {
    const category = await prisma.menuCategory.findFirst({ where: { id: catId, restaurantId } });
    if (!category) throw new NotFoundError('Category');

    await prisma.menuCategory.update({ where: { id: catId }, data: { isActive: false } });
    await this.invalidateMenuCache(restaurantId);
  }

  // ========== Menu Items ==========

  async listItems(restaurantId: string, categoryId?: string, available?: boolean, search?: string) {
    const where: Record<string, unknown> = { restaurantId, isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (available !== undefined) where.isAvailable = available;
    if (search) where.name = { contains: search };

    return prisma.menuItem.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async getItem(restaurantId: string, itemId: string) {
    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!item) throw new NotFoundError('Menu item');
    return item;
  }

  async createItem(restaurantId: string, input: CreateMenuItemInput, imageUrl?: string) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: input.categoryId, restaurantId, isActive: true },
    });
    if (!category) throw new NotFoundError('Category');

    const item = await prisma.menuItem.create({
      data: { ...input, restaurantId, imageUrl },
      include: { category: { select: { id: true, name: true } } },
    });

    await this.invalidateMenuCache(restaurantId);
    logger.info('Menu item created', { itemId: item.id, restaurantId });
    return item;
  }

  async updateItem(restaurantId: string, itemId: string, input: UpdateMenuItemInput, imageUrl?: string) {
    const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
    if (!item) throw new NotFoundError('Menu item');

    if (input.categoryId) {
      const category = await prisma.menuCategory.findFirst({
        where: { id: input.categoryId, restaurantId, isActive: true },
      });
      if (!category) throw new NotFoundError('Category');
    }

    const data: Record<string, unknown> = { ...input };
    if (imageUrl) data.imageUrl = imageUrl;

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data,
      include: { category: { select: { id: true, name: true } } },
    });

    await this.invalidateMenuCache(restaurantId);
    return updated;
  }

  async toggleAvailability(restaurantId: string, itemId: string, isAvailable: boolean) {
    const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
    if (!item) throw new NotFoundError('Menu item');

    const updated = await prisma.menuItem.update({ where: { id: itemId }, data: { isAvailable } });
    await this.invalidateMenuCache(restaurantId);
    logger.info(`Item ${isAvailable ? 'enabled' : 'disabled'}`, { itemId, restaurantId });
    return updated;
  }

  async deleteItem(restaurantId: string, itemId: string) {
    const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
    if (!item) throw new NotFoundError('Menu item');

    await prisma.menuItem.update({ where: { id: itemId }, data: { isActive: false } });
    await this.invalidateMenuCache(restaurantId);
  }

  // ========== Public Menu (Cached) ==========

  async getPublicMenu(restaurantSlug: string, tableId?: string) {
    const redis = getRedis();

    // Try to find restaurant ID from slug
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: {
        id: true, name: true, slug: true, logo: true, openingTime: true, closingTime: true, isActive: true,
        address: true, phone: true,
      },
    });

    if (!restaurant || !restaurant.isActive) throw new NotFoundError('Restaurant', 'RESTAURANT_NOT_FOUND');

    let table = null;
    if (tableId) {
      table = await prisma.table.findFirst({
        where: { id: tableId, restaurantId: restaurant.id, isActive: true },
        select: { id: true, tableNumber: true }
      });
      if (!table) throw new NotFoundError('Table', 'TABLE_NOT_FOUND');
    }

    let menuData: any = null;
    
    // Check cache
    if (redis) {
      try {
        const cached = await redis.get(`menu:${restaurant.id}`);
        if (cached) menuData = JSON.parse(cached);
      } catch (e) {
        logger.warn('Menu cache read failed, falling back to DB', {
          restaurantId: restaurant.id,
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }

    if (!menuData) {
      // Fetch from database
      const categories = await prisma.menuCategory.findMany({
        where: { restaurantId: restaurant.id, isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true, categoryId: true, name: true, description: true, price: true,
              imageUrl: true, isVeg: true, isAvailable: true,
            },
          },
        },
      });

      menuData = { restaurant, categories };

      // Set cache
      if (redis) {
        try {
          await redis.setex(`menu:${restaurant.id}`, MENU_CACHE_TTL, JSON.stringify(menuData));
        } catch (e) {
          logger.warn('Menu cache write failed', {
            restaurantId: restaurant.id,
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      }
    }

    return {
      ...menuData,
      table,
    };
  }

  // ========== Cache ==========

  private async invalidateMenuCache(restaurantId: string): Promise<void> {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.del(`menu:${restaurantId}`);
        logger.debug('Menu cache invalidated', { restaurantId });
      } catch (e) {
        logger.warn('Menu cache invalidation failed', {
          restaurantId,
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }
  }
}
