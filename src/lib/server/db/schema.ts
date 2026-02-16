import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export * from './auth-schema';

export const pcTrials = pgTable("pc_trials", {
    id: serial("id").primaryKey(),
    pcIdentifier: text("pc_identifier").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

