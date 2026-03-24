import { z } from 'zod';
import { uuidSchema, actorTypeSchema, activityActionSchema } from './common';

export const activitySchema = z.object({
  id: uuidSchema,
  taskId: uuidSchema,
  actorId: uuidSchema,
  actorType: actorTypeSchema,
  action: activityActionSchema,
  fieldChanged: z.string().nullable(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  timestamp: z.coerce.date(),
});
