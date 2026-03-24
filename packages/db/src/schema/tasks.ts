import { pgTable, uuid, varchar, text, jsonb, timestamp, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { projects } from './projects';
import { users } from './users';
import { comments } from './comments';
import { activities } from './activities';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('backlog'),
  priority: varchar('priority', { length: 5 }).notNull().default('P2'),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  assigneeType: varchar('assignee_type', { length: 10 }),
  parentTaskId: uuid('parent_task_id').references((): AnyPgColumn => tasks.id, { onDelete: 'set null' }),
  labels: text('labels').array().notNull().default(sql`'{}'::text[]`),
  estimate: varchar('estimate', { length: 50 }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdByType: varchar('created_by_type', { length: 10 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('tasks_project_id_idx').on(table.projectId),
  index('tasks_status_idx').on(table.status),
  index('tasks_project_status_idx').on(table.projectId, table.status),
  index('tasks_assignee_id_idx').on(table.assigneeId),
  index('tasks_parent_task_id_idx').on(table.parentTaskId),
  index('tasks_priority_idx').on(table.priority),
  index('tasks_created_at_idx').on(table.createdAt),
]);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: 'assignee',
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: 'creator',
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: 'subtasks',
  }),
  subtasks: many(tasks, { relationName: 'subtasks' }),
  comments: many(comments),
  activities: many(activities),
}));
