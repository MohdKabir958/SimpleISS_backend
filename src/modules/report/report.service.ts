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
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    }));
  }
}
