import type { PageServerLoad, Actions } from './$types';
import { auth, dodoPayments } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, request }) => {
	const search = url.searchParams.get('search');

	const { users } = await auth.api.listUsers({
		query: {
			...(search && {
				searchValue: search,
				searchField: 'email'
			}),
			limit: 100
		},
		headers: request.headers
	});

	return {
		users
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) return fail(400, { message: 'User ID is required' });

		await auth.api.removeUser({
			body: { userId },
			headers: request.headers
		});
		return { success: true };
	},

	toggleStatus: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const isBanned = formData.get('isBanned') === 'true';

		if (!userId) return fail(400, { message: 'User ID is required' });

		if (isBanned) {
			await auth.api.unbanUser({
				body: { userId },
				headers: request.headers
			});
		} else {
			await auth.api.banUser({
				body: { userId, banReason: 'Admin disabled' },
				headers: request.headers
			});
		}
		return { success: true };
	},

	grantPro: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const duration = parseInt(formData.get('duration') as string);
		const unit = formData.get('unit') as string;

		if (!userId || isNaN(duration) || !unit) {
			return fail(400, { message: 'Missing required fields' });
		}

		// Fetch user email to search in Dodo
		const userRow = await db.query.user.findFirst({
			where: (u, { eq }) => eq(u.id, userId),
			columns: { email: true }
		});

		if (!userRow) return fail(404, { message: 'User not found' });

		const expirationDate = new Date();
		if (unit === 'Days') expirationDate.setDate(expirationDate.getDate() + duration);
		else if (unit === 'Months') expirationDate.setMonth(expirationDate.getMonth() + duration);
		else if (unit === 'Years') expirationDate.setFullYear(expirationDate.getFullYear() + duration);

		// Check for active Dodo subscription
		let dodoSubscriptionId: string | null = null;
		try {
			const customers = await dodoPayments.customers.list({ email: userRow.email });
			if (customers.items && customers.items.length > 0) {
				const customerId = customers.items[0].customer_id;
				const subs = await dodoPayments.subscriptions.list({
					customer_id: customerId,
					status: 'active'
				});
				if (subs.items && subs.items.length > 0) {
					dodoSubscriptionId = subs.items[0].subscription_id;
				}
			}
		} catch (e) {
			console.error('Error checking Dodo subscriptions:', e);
		}

		if (dodoSubscriptionId) {
			// Update Dodo Subscription next_billing_date
			await dodoPayments.subscriptions.update(dodoSubscriptionId, {
				next_billing_date: expirationDate.toISOString()
			});
		}

		// Update or Override local cache
		// Using the admin API ensures audit logs and proper metadata handling if enabled
		await auth.api.adminUpdateUser({
			body: {
				userId,
				data: {
					proExpiration: expirationDate,
					proStatusCachedAt: new Date()
				}
			},
			headers: request.headers
		});

		return { success: true };
	}
};
