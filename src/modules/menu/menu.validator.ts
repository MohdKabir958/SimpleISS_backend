import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

export const reorderCategorySchema = z.object({
  sortOrder: z.number().int().min(0),
});

export const createMenuItemSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  price: z.number().positive().max(99999).multipleOf(0.01),
  description: z.string().max(500).optional(),
  categoryId: z.string().uuid(),
  isVeg: z.boolean().default(false),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
