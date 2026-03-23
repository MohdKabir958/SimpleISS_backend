import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const customerSignupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().email('Invalid email format').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const refreshTokenSchema = z.object({});

export type LoginInput = z.infer<typeof loginSchema>;
export type CustomerSignupInput = z.infer<typeof customerSignupSchema>;
