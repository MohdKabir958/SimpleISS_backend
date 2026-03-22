import { z } from 'zod';

export const createTableSchema = z.object({
  tableNumber: z.number().int().positive().min(1).max(999),
  capacity: z.number().int().positive().min(1).max(20).default(4),
});

export const updateTableSchema = z.object({
  tableNumber: z.number().int().positive().min(1).max(999).optional(),
  capacity: z.number().int().positive().min(1).max(20).optional(),
  isActive: z.boolean().optional(),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
