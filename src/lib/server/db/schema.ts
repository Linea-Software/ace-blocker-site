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

export const userRelations = relations(user, ({ many, one }) => ({
	sessions: many(session),
	accounts: many(account),
	apikeys: many(apikey),
	backups: one(backups),
	proStatus: one(proStatus),
	twoFactors: many(twoFactor)
}));
