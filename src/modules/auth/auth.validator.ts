import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const refreshTokenSchema = z.object({});

export type LoginInput = z.infer<typeof loginSchema>;
