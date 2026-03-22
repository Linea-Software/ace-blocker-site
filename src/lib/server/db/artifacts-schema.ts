import { relations } from "drizzle-orm";
import {
    pgTable,
    text,
    timestamp,
    boolean,
    integer,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";


const osEnum = pgEnum('os', ['windows', 'linux', 'macos']);
const architectureEnum = pgEnum('architecture', ['x64', 'arm64']);

export const aceBlockerInstaller = pgTable('ace_blocker_installer', {
    id: text('id').primaryKey(),
    fileName: text('file_name').notNull(),
    version: text('version').notNull(),
    os: osEnum('os').notNull(),
    architecture: architectureEnum('architecture').notNull(),
    // to be set by the program
    downloadUrl: text('download_url').notNull(),
    // to be set by the program
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // hash
    sha256: text('sha256').notNull(),
});

export const resistanceModeScripts = pgTable('resistance_mode_scripts', {
    id: text('id').primaryKey(),
    fileName: text('file_name').notNull(),
    version: text('version').notNull(),
    // to be set by the program
    downloadUrl: text('download_url').notNull(),
    // to be set by the program
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // hash
    sha256: text('sha256').notNull(),
});

export const trackingScripts = pgTable('tracking_scripts', {
    id: text('id').primaryKey(),
    fileName: text('file_name').notNull(),
    version: text('version').notNull(),
    // to be set by the program
    downloadUrl: text('download_url').notNull(),
    // to be set by the program
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // hash
    sha256: text('sha256').notNull(),
});