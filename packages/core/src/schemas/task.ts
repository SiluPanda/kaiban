import { z } from 'zod';
import { uuidSchema, prioritySchema, statusSchema, actorTypeSchema } from './common';

export const taskSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  status: statusSchema,
  priority: prioritySchema,
  assigneeId: uuidSchema.nullable(),
  assigneeType: actorTypeSchema.nullable(),
  parentTaskId: uuidSchema.nullable(),
  labels: z.array(z.string()),
  estimate: z.string().nullable(),
  dueDate: z.coerce.date().nullable(),
  metadata: z.record(z.unknown()).default({}),
  createdBy: uuidSchema,
  createdByType: actorTypeSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: statusSchema.default('backlog'),
  priority: prioritySchema.default('P2'),
  assigneeId: uuidSchema.optional(),
  assigneeType: actorTypeSchema.optional(),
  parentTaskId: uuidSchema.optional(),
  labels: z.array(z.string()).default([]),
  estimate: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  assigneeId: uuidSchema.nullable().optional(),
  assigneeType: actorTypeSchema.nullable().optional(),
  labels: z.array(z.string()).optional(),
  estimate: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});
