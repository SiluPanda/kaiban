import { z } from 'zod';
import { uuidSchema } from './common';

export const agentSessionSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  agentName: z.string().min(1).max(255),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
  tasksTouched: z.array(z.string()),
  summary: z.string().nullable(),
});

export const startSessionSchema = z.object({
  tasks: z.array(uuidSchema).default([]),
});

export const endSessionSchema = z.object({
  summary: z.string().optional(),
});
