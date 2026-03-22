
import {
    pgTable,
    text,
    timestamp,
    pgEnum,
} from "drizzle-orm/pg-core";


const osEnum = pgEnum('os', ['windows', 'linux', 'macos']);
const architectureEnum = pgEnum('architecture', ['x64', 'arm64']);

// will stay in 
// CDN -> /ace-blocker-installer/<version>/<filename>
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
    // to be set by the program
    sha256: text('sha256').notNull(),
});

// will stay in 
// CDN -> /resistance-mode-scripts/<version>/<filename>
export const resistanceModeScripts = pgTable('resistance_mode_scripts', {
    id: text('id').primaryKey(),
    fileName: text('file_name').notNull(),
    version: text('version').notNull(),
    // to be set by the program
    downloadUrl: text('download_url').notNull(),
    // to be set by the program
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // to be set by the program
    sha256: text('sha256').notNull(),
});


// will stay in 
// CDN -> /tracking-scripts/<version>/<filename>
export const trackingScripts = pgTable('tracking_scripts', {
    id: text('id').primaryKey(),
    fileName: text('file_name').notNull(),
    version: text('version').notNull(),
    // to be set by the program
    downloadUrl: text('download_url').notNull(),
    // to be set by the program
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // to be set by the program
    sha256: text('sha256').notNull(),
});