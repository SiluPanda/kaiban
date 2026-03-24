import { z } from 'zod';
import { uuidSchema, statusSchema } from './common';

export const projectSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  defaultStatusFlow: z.array(z.string()),
  settings: z.record(z.unknown()).default({}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createProjectSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  defaultStatusFlow: z.array(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  defaultStatusFlow: z.array(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
});
