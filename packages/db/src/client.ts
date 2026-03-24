import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pith';
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL environment variable is required in production');
}

const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });

export { queryClient };
