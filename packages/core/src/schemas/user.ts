import { z } from 'zod';
import { uuidSchema, userRoleSchema } from './common';

export const userSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  role: userRoleSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  role: userRoleSchema.default('member'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  role: userRoleSchema.optional(),
});
