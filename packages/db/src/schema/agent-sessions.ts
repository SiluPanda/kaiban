import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

export const agentSessions = pgTable('agent_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  agentName: varchar('agent_name', { length: 255 }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  tasksTouched: text('tasks_touched').array().notNull().default(sql`'{}'::text[]`),
  summary: text('summary'),
}, (table) => [
  index('agent_sessions_user_id_idx').on(table.userId),
]);

export const agentSessionsRelations = relations(agentSessions, ({ one }) => ({
  user: one(users, {
    fields: [agentSessions.userId],
    references: [users.id],
  }),
}));
