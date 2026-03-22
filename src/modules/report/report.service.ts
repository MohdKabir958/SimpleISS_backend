import { prisma } from '../../config/database';
import { OrderStatus } from '../../shared/types/enums';

export class ReportService {
  async getDashboardStats(restaurantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrdersToday, completedSessionsToday, revenueToday] = await Promise.all([
      prisma.order.count({
        where: { restaurantId, createdAt: { gte: today } },
      }),
      prisma.tableSession.count({
        where: { restaurantId, status: 'COMPLETED', createdAt: { gte: today } },
      }),
      prisma.payment.aggregate({
        where: { restaurantId, status: 'COMPLETED', createdAt: { gte: today } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      orders: totalOrdersToday,
      sessions: completedSessionsToday,
      revenue: Number(revenueToday._sum.totalAmount || 0),
    };
  }

  async getRevenueReport(restaurantId: string, startDate?: string, endDate?: string) {
    const where: any = { restaurantId, status: 'COMPLETED' };
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const dailyRevenue: Record<string, number> = {};
    let total = 0;

    payments.forEach((p: any) => {
      const date = p.createdAt.toISOString().split('T')[0];
      const amount = Number(p.totalAmount);
      dailyRevenue[date] = (dailyRevenue[date] || 0) + amount;
      total += amount;
    });

    return { dailyRevenue, total };
  }

  async getPopularItems(restaurantId: string, limit = 10) {
    // In Prisma SQLite, group by on joined fields is complex, so we do it memory-efficiently
    const completedOrders = await prisma.order.findMany({
      where: { restaurantId, status: OrderStatus.COMPLETED },
      include: { items: true },
    });

    const itemCounts: Record<string, { name: string, quantity: number, revenue: number }> = {};

    completedOrders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        if (!itemCounts[item.menuItemId]) {
          itemCounts[item.menuItemId] = { name: item.itemName, quantity: 0, revenue: 0 };
        }
        itemCounts[item.menuItemId].quantity += item.quantity;
        itemCounts[item.menuItemId].revenue += item.quantity * Number(item.itemPrice);
      });
    });

    return Object.values(itemCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }
}
