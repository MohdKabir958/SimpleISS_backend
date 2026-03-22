import { z } from 'zod';
import { OrderStatus } from '../../shared/types/enums';

export const orderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive().max(50),
  // Clients often send JSON null; `.optional()` only allows undefined, not null
  notes: z.string().max(250).nullish(),
});

export const placeOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
  notes: z.string().max(500).nullish(),
  // Flutter sends these; service uses server-side totals; idempotency from header in controller
  totalAmount: z.number().optional(),
  idempotencyKey: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  rejectionReason: z.string().max(250).optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
