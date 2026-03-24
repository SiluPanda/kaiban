import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tasks } from './tasks';

export const taskLinks = pgTable('task_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // 'github', 'gitlab', etc.
  linkType: varchar('link_type', { length: 50 }).notNull(), // 'issue', 'pull_request', 'branch'
  externalId: varchar('external_id', { length: 255 }).notNull(), // e.g., 'owner/repo#123'
  externalUrl: varchar('external_url', { length: 2048 }).notNull(),
  title: text('title'),
  status: varchar('status', { length: 50 }), // 'open', 'closed', 'merged'
  metadata: text('metadata'), // JSON string for provider-specific data
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('task_links_task_id_idx').on(table.taskId),
  index('task_links_external_id_idx').on(table.externalId),
]);

export const taskLinksRelations = relations(taskLinks, ({ one }) => ({
  task: one(tasks, {
    fields: [taskLinks.taskId],
    references: [tasks.id],
  }),
}));
