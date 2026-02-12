import { betterAuth } from 'better-auth';
import { admin } from "better-auth/plugins"
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '$lib/server/db';
import { dodopayments, checkout, webhooks, type Product } from '@dodopayments/better-auth';
import DodoPayments from 'dodopayments';

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { resend } from '$lib/server/email';

if (!env.DODO_PAYMENTS_API_KEY) {
	throw new Error('DODO_PAYMENTS_API_KEY is not set');
}

if (!env.DODO_PAYMENTS_PRODUCTS) {
	throw new Error('DODO_PAYMENTS_PRODUCTS is not set');
}

if (!env.DODO_PAYMENTS_WEBHOOK_SECRET) {
	throw new Error('DODO_PAYMENTS_WEBHOOK_SECRET is not set');
}

export const dodoPayments = new DodoPayments({
	bearerToken: env.DODO_PAYMENTS_API_KEY,
	environment: dev ? 'test_mode' : 'live_mode'
});

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: !dev
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url, token }, request) => {
			resend.emails.send({
				from: 'noreply@send.aceblocker.com',
				to: user.email,
				subject: 'Verify your email',
				text: `Click the link to verify your email: ${url}`
			})
		}
	},
	plugins: [
		admin(),
		dodopayments({
			client: dodoPayments,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products:
						JSON.parse(env.DODO_PAYMENTS_PRODUCTS!) as Product[]
					,
					successUrl: '/dashboard/success',
					authenticatedUsersOnly: true
				}),
				webhooks({
					webhookKey: env.DODO_PAYMENTS_WEBHOOK_SECRET!,
					onPayload: async (payload) => {
						console.log('Received webhook:', payload.type);
					},
					onPaymentSucceeded: async (payload) => {
						console.log('Payment succeeded:', payload);
					},
					onPaymentFailed: async (payload) => {
						console.log('Payment failed:', payload);
					}
				})
			]
		})
	]
});



// if (dev) {
// 	const { users } = await auth.api.listUsers({
// 		query: {
// 			limit: 1,
// 			searchField: 'email',
// 			searchValue: 'dev@example.com'
// 		}
// 	});

// 	if (users.length === 0) {
// 		await auth.api.createUser({
// 			body: {
// 				email: 'dev@example.com',
// 				password: 'dev-password',
// 				name: 'Dev User',
// 				role: 'user'
// 			}
// 		});
// 	}

// 	console.log('✅ Created default dev user: dev@example.com / dev-password');
// }
