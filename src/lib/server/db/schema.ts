import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { user, session, account, apikey, twoFactor } from './auth-schema';
import { relations } from 'drizzle-orm';

export * from './auth-schema';
export * from './artifacts-schema';

export const proStatus = pgTable('pro_status', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
		.unique(),
	cachedAt: timestamp('cached_at'),
	expiration: timestamp('expiration')
});

export const proStatusRelations = relations(proStatus, ({ one }) => ({
	user: one(user, {
		fields: [proStatus.userId],
		references: [user.id]
	})
}));

export const backups = pgTable(
	'backups',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
			.unique(),
		data: text('data').notNull(),
		version: text('version').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('backups_userId_idx').on(table.userId)]
);

export const backupsRelations = relations(backups, ({ one }) => ({
	user: one(user, {
		fields: [backups.userId],
		references: [user.id]
	})
}));

export const siteVisits = pgTable(
	'site_visits',
	{
		id: text('id').primaryKey(),
		path: text('path').notNull(),
		referrer: text('referrer'),
		timestamp: timestamp('timestamp').defaultNow().notNull()
	},
	(table) => [index('site_visits_timestamp_idx').on(table.timestamp)]
);

/**
 * Registry of processed DodoPayments webhook events. The webhook payloads
 * carry no event id (only the webhook-id header, which the plugin does not
 * expose to handlers), so deduplication uses a digest of the normalized
 * payload. The uniqueness of `eventKey` makes repeated deliveries of the
 * same event no-ops, and `subscriptionId` + `eventTimestamp` allow rejecting
 * stale events that arrive after a newer one for the same subscription.
 */
export const dodoWebhookEvents = pgTable(
	'dodo_webhook_events',
	{
		id: text('id').primaryKey(),
		eventKey: text('event_key').notNull().unique(),
		type: text('type').notNull(),
		subscriptionId: text('subscription_id'),
		eventTimestamp: timestamp('event_timestamp').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('dodo_webhook_events_subscription_idx').on(table.subscriptionId),
		index('dodo_webhook_events_event_timestamp_idx').on(table.eventTimestamp)
	]
);

export const userRelations = relations(user, ({ many, one }) => ({
	sessions: many(session),
	accounts: many(account),
	apikeys: many(apikey),
	backups: one(backups),
	proStatus: one(proStatus),
	twoFactors: many(twoFactor)
}));

/** Expiring device grants, storing only SHA-256 hashes of the two codes. */
export const deviceLinks = pgTable(
	'device_links',
	{
		deviceCodeHash: text('device_code_hash').primaryKey(),
		userCodeHash: text('user_code_hash').notNull().unique(),
		status: text('status').notNull().default('pending'),
		approvedUserId: text('approved_user_id').references(() => user.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		lastPolledAt: timestamp('last_polled_at', { withTimezone: true }),
		consumedAt: timestamp('consumed_at', { withTimezone: true })
	},
	(table) => [index('device_links_expiry_idx').on(table.expiresAt)]
);
