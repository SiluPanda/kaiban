import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';

export const notificationChannels = pgTable('notification_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull(), // 'slack', 'discord'
  name: varchar('name', { length: 255 }).notNull(),
  webhookUrl: varchar('webhook_url', { length: 2048 }).notNull(),
  events: text('events').array().notNull(), // ['task.created', 'task.updated', ...]
  active: boolean('active').notNull().default(true),
  config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('notification_channels_project_id_idx').on(table.projectId),
]);

export const notificationChannelsRelations = relations(notificationChannels, ({ one }) => ({
  project: one(projects, {
    fields: [notificationChannels.projectId],
    references: [projects.id],
  }),
}));
