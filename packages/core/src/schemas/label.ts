import { z } from 'zod';
import { uuidSchema } from './common';

export const labelSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const createLabelSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
