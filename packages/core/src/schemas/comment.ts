import { z } from 'zod';
import { uuidSchema, actorTypeSchema } from './common';

export const commentSchema = z.object({
  id: uuidSchema,
  taskId: uuidSchema,
  body: z.string().min(1),
  authorId: uuidSchema,
  authorType: actorTypeSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(50000),
});
