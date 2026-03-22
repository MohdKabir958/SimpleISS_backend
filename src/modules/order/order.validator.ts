import { z } from 'zod';
import { OrderStatus } from '../../shared/types/enums';

export const orderItemSchema = z.object({
  // Use loose id check: Zod 4's .uuid() enforces RFC variant bits; legacy/demo IDs in DB
  // (e.g. ...-2222-2222-2222-...) are rejected. Existence is validated in OrderService.
  menuItemId: z.string().min(1).max(64),
  quantity: z.coerce.number().int().positive().max(50),
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
  // JSON clients may send null when clearing / omitting reason
  rejectionReason: z.string().max(250).nullish(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
