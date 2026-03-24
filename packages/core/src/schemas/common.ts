import { z } from 'zod';
import { PRIORITY_VALUES } from '../constants/priority.js';
import { DEFAULT_STATUS_FLOW } from '../constants/status.js';
import { ACTOR_TYPES } from '../constants/actor-types.js';
import { USER_ROLES } from '../constants/roles.js';
import { ACTIVITY_ACTIONS } from '../constants/activity-actions.js';

export const uuidSchema = z.string().uuid();

export const prioritySchema = z.enum(PRIORITY_VALUES);

export const statusSchema = z.enum(DEFAULT_STATUS_FLOW);

export const actorTypeSchema = z.enum(ACTOR_TYPES);

export const userRoleSchema = z.enum(USER_ROLES);

export const activityActionSchema = z.enum(ACTIVITY_ACTIONS);

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const timestampSchema = z.coerce.date();
