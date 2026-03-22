import { z } from 'zod';

export const createRestaurantSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  slug: z.string().min(2).max(50).toLowerCase().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
  address: z.string().min(5).max(500).trim(),
  phone: z.string().min(5).max(20).trim(),
  email: z.string().email().optional().or(z.literal('')),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM').default('09:00'),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM').default('23:00'),
  orderPrefix: z.string().min(2).max(5).toUpperCase().default('ORD'),
});

export const updateRestaurantSchema = createRestaurantSchema.partial();

export const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

export const createUserSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  name: z.string().min(2).max(100).trim(),
  role: z.enum(['RESTAURANT_ADMIN', 'KITCHEN_STAFF']),
  restaurantId: z.string().uuid(),
});

export const createStaffSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  name: z.string().min(2).max(100).trim(),
});

export const updateStaffSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  isActive: z.boolean().optional(),
});

export const updateRestaurantProfileSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  address: z.string().min(5).max(500).trim().optional(),
  phone: z.string().min(5).max(20).trim().optional(),
  email: z.string().email().optional().or(z.literal('')),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type UpdateRestaurantProfileInput = z.infer<typeof updateRestaurantProfileSchema>;
