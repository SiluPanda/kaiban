import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tasks } from './tasks';
import { users } from './users';

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  actorType: varchar('actor_type', { length: 10 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  fieldChanged: varchar('field_changed', { length: 100 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('activities_task_id_idx').on(table.taskId),
  index('activities_actor_id_idx').on(table.actorId),
  index('activities_timestamp_idx').on(table.timestamp),
]);

export const activitiesRelations = relations(activities, ({ one }) => ({
  task: one(tasks, {
    fields: [activities.taskId],
    references: [tasks.id],
  }),
  actor: one(users, {
    fields: [activities.actorId],
    references: [users.id],
  }),
}));
