import type { z } from 'zod';
import type {
  projectSchema,
  createProjectSchema,
  updateProjectSchema,
} from '../schemas/project.js';
import type {
  taskSchema,
  createTaskSchema,
  updateTaskSchema,
} from '../schemas/task.js';
import type {
  commentSchema,
  createCommentSchema,
} from '../schemas/comment.js';
import type { activitySchema } from '../schemas/activity.js';
import type {
  userSchema,
  createUserSchema,
  updateUserSchema,
} from '../schemas/user.js';
import type {
  agentSessionSchema,
  startSessionSchema,
  endSessionSchema,
} from '../schemas/agent-session.js';
import type { labelSchema, createLabelSchema } from '../schemas/label.js';
import type { viewSchema, createViewSchema } from '../schemas/view.js';

export type Project = z.infer<typeof projectSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export type Task = z.infer<typeof taskSchema>;
export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

export type Comment = z.infer<typeof commentSchema>;
export type CreateComment = z.infer<typeof createCommentSchema>;

export type Activity = z.infer<typeof activitySchema>;

export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type AgentSession = z.infer<typeof agentSessionSchema>;
export type StartSession = z.infer<typeof startSessionSchema>;
export type EndSession = z.infer<typeof endSessionSchema>;

export type Label = z.infer<typeof labelSchema>;
export type CreateLabel = z.infer<typeof createLabelSchema>;

export type View = z.infer<typeof viewSchema>;
export type CreateView = z.infer<typeof createViewSchema>;
