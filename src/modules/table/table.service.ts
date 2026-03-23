import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ConflictError } from '../../shared/errors/ConflictError';
import { CreateTableInput } from './table.validator';

export class TableService {
  async listTables(restaurantId: string) {
    return prisma.table.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { tableNumber: 'asc' },
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
          select: { id: true, status: true, startedAt: true, totalAmount: true },
          take: 1,
        },
      },
    });
  }

  async createTable(restaurantId: string, input: CreateTableInput) {
    const existing = await prisma.table.findUnique({
      where: { restaurantId_tableNumber: { restaurantId, tableNumber: input.tableNumber } },
    });

    // Soft-delete aware behavior:
    // If same table number exists but inactive, restore it instead of throwing 409.
    if (existing) {
      if (!existing.isActive) {
        const restored = await prisma.table.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            capacity: input.capacity,
          },
        });
        logger.info('Table restored from soft-delete', {
          tableId: restored.id,
          restaurantId,
          number: input.tableNumber,
        });
        return restored;
      }
      throw new ConflictError(`Table ${input.tableNumber} already exists`);
    }

    const table = await prisma.table.create({
      data: { ...input, restaurantId },
    });

    logger.info('Table created', { tableId: table.id, restaurantId, number: input.tableNumber });
    return table;
  }

  async updateTable(restaurantId: string, tableId: string, input: Partial<CreateTableInput>) {
    const table = await prisma.table.findFirst({ where: { id: tableId, restaurantId } });
    if (!table) throw new NotFoundError('Table');

    if (input.tableNumber && input.tableNumber !== table.tableNumber) {
      const exists = await prisma.table.findUnique({
        where: { restaurantId_tableNumber: { restaurantId, tableNumber: input.tableNumber } },
      });
      if (exists) throw new ConflictError(`Table ${input.tableNumber} already exists`);
    }

    return prisma.table.update({ where: { id: tableId }, data: input });
  }

  async deleteTable(restaurantId: string, tableId: string) {
    const table = await prisma.table.findFirst({ where: { id: tableId, restaurantId } });
    if (!table) throw new NotFoundError('Table');

    await prisma.table.update({ where: { id: tableId }, data: { isActive: false } });
    logger.info('Table soft-deleted', { tableId, restaurantId });
  }

  async getTableSession(restaurantId: string, tableId: string) {
    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurantId },
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
          include: {
            orders: { include: { items: true }, orderBy: { placedAt: 'desc' } },
          },
          take: 1,
        },
      },
    });

    if (!table) throw new NotFoundError('Table');
    return { table, activeSession: table.sessions[0] || null };
  }
}
