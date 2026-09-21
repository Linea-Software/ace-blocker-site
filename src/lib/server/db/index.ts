import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import 'dotenv/config';
const env = process.env;

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export const dbClient = postgres(env.DATABASE_URL);

export const db = drizzle(dbClient, { schema });
