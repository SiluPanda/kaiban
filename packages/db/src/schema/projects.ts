import { pgTable, uuid, varchar, text, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { DEFAULT_STATUS_FLOW } from '@kaiban/core/constants';
import { tasks } from './tasks';
import { labels } from './labels';
import { views } from './views';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  defaultStatusFlow: jsonb('default_status_flow').$type<string[]>().notNull().default([...DEFAULT_STATUS_FLOW]),
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('projects_slug_idx').on(table.slug),
]);

export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
  labels: many(labels),
  views: many(views),
}));
