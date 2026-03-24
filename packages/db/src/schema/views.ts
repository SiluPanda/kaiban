import { pgTable, uuid, varchar, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';
import { users } from './users';

export const views = pgTable('views', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  filters: jsonb('filters').$type<Record<string, unknown>>().notNull().default({}),
  sort: jsonb('sort').$type<Record<string, unknown>>().notNull().default({}),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
}, (table) => [
  index('views_project_id_idx').on(table.projectId),
]);

export const viewsRelations = relations(views, ({ one }) => ({
  project: one(projects, {
    fields: [views.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [views.createdBy],
    references: [users.id],
  }),
}));
