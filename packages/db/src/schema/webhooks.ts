import { pgTable, uuid, varchar, text, integer, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 2048 }).notNull(),
  secret: varchar('secret', { length: 255 }).notNull(),
  events: text('events').array().notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('webhooks_project_id_idx').on(table.projectId),
]);

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  project: one(projects, {
    fields: [webhooks.projectId],
    references: [projects.id],
  }),
}));

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  event: varchar('event', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  statusCode: varchar('status_code', { length: 10 }),
  responseBody: text('response_body'),
  success: boolean('success').notNull().default(false),
  attempts: integer('attempts').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('webhook_deliveries_webhook_id_idx').on(table.webhookId),
  index('webhook_deliveries_created_at_idx').on(table.createdAt),
]);

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhookId],
    references: [webhooks.id],
  }),
}));
