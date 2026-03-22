import { z } from 'zod';

export const createSessionSchema = z.object({
  tableId: z.string().uuid('Invalid table ID'),
});

export const closeSessionSchema = z.object({
  status: z.enum(['COMPLETED', 'EXPIRED']),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
