import { prisma } from '../../config/database';
import { OrderStatus } from '../../shared/types/enums';

export class ReportService {
  async getDashboardStats(restaurantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrdersToday, activeSessions, revenueToday, pendingOrders, totalTables] = await Promise.all([
      prisma.order.count({
        where: { restaurantId, createdAt: { gte: today } },
      }),
      prisma.tableSession.count({
        where: { restaurantId, status: 'ACTIVE' },
      }),
      prisma.payment.aggregate({
        where: { restaurantId, status: 'COMPLETED', createdAt: { gte: today } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: { restaurantId, status: { in: ['PLACED', 'ACCEPTED', 'PREPARING'] } },
      }),
      prisma.table.count({
        where: { restaurantId, isActive: true },
      }),
    ]);

    return {
      todayOrders: totalOrdersToday,
      activeSessions: activeSessions,
      totalTables,
      todayRevenue: Number(revenueToday._sum.totalAmount || 0),
      totalRevenue: Number(revenueToday._sum.totalAmount || 0), // Alias for ReportsScreen
      pendingOrders: pendingOrders,
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

    return { 
      dailyRevenue, 
      total,
      totalRevenue: total // Alias for ReportsScreen
    };
  }

  async getPopularItems(restaurantId: string, limit = 10) {
    const rows = await prisma.$queryRaw<
      Array<{ menuItemId: string; itemName: string; quantity: unknown; revenue: unknown }>
    >`
      SELECT oi."menuItemId", oi."itemName",
             SUM(oi.quantity)::int AS quantity,
             SUM(oi.quantity * oi."itemPrice")::float AS revenue
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON oi."orderId" = o.id
      WHERE o."restaurantId" = ${restaurantId} AND o.status = ${OrderStatus.COMPLETED}
      GROUP BY oi."menuItemId", oi."itemName"
      ORDER BY SUM(oi.quantity) DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      name: r.itemName,
      itemName: r.itemName, // Alias
      quantity: Number(r.quantity),
      totalQuantity: Number(r.quantity), // Alias
      revenue: Number(r.revenue),
      totalRevenue: Number(r.revenue), // Alias
    }));
  }
}
