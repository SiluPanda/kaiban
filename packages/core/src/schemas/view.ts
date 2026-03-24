import { z } from 'zod';
import { uuidSchema } from './common';

export const viewSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  name: z.string().min(1).max(255),
  filters: z.record(z.unknown()).default({}),
  sort: z.record(z.unknown()).default({}),
  createdBy: uuidSchema,
});

export const createViewSchema = z.object({
  name: z.string().min(1).max(255),
  filters: z.record(z.unknown()).optional(),
  sort: z.record(z.unknown()).optional(),
});
