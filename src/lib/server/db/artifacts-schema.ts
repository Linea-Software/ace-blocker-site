
import {
    pgTable,
    text,
    timestamp,
    pgEnum,
    uuid,
    boolean,
    integer,
} from "drizzle-orm/pg-core";


export const osEnum = pgEnum('os', ['windows', 'linux', 'macos']);
export const architectureEnum = pgEnum('architecture', ['x64', 'arm64']);

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
    // to be set by the program
    size: integer('size').notNull(),
    // to be set by the admins/program: if there's a new version, this will be set to false
    canBeDownloaded: boolean('can_be_downloaded').default(true).notNull(),
    // to be set by the program
    downloadCount: integer('download_count').default(0).notNull(),
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
    // to be set by the program
    size: integer('size').notNull(),
    // to be set by the admins/program: if there's a new version, this will be set to false
    canBeDownloaded: boolean('can_be_downloaded').default(true).notNull(),
    // to be set by the program
    downloadCount: integer('download_count').default(0).notNull(),
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
    // to be set by the program
    size: integer('size').notNull(),
    // to be set by the admins/program: if there's a new version, this will be set to false
    canBeDownloaded: boolean('can_be_downloaded').default(true).notNull(),
    // to be set by the program
    downloadCount: integer('download_count').default(0).notNull(),
});

// will stay in 
// CDN -> /site-lists/<filename>
export const siteList = pgTable('site_list', {
    // the app will ask for this id, we'll return the latest uploaded file with this site_list_id
    // the admin will set this id in the admin panel
    id: uuid('id').primaryKey(),

    name: text('name').notNull(),
    // it will usually be <id>.zip
    fileName: text('file_name').notNull(),
    // to be set by the admins
    requiresProSubscription: boolean('requires_pro_subscription').default(true).notNull(),
    // to be set by the program
    downloadUrl: text('download_url').notNull(),
    // to be set by the program
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // to be set by the program
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // to be set by the program
    sha256: text('sha256').notNull(),
    // to be set by the program
    size: integer('size').notNull(),
    // to be set by the admins/program: if there's a new version, this will be set to false
    canBeDownloaded: boolean('can_be_downloaded').default(true).notNull(),
    // to be set by the program
    downloadCount: integer('download_count').default(0).notNull(),
});