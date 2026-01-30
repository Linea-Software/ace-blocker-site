import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { dodopayments, checkout, webhooks } from '@dodopayments/better-auth';
import DodoPayments from 'dodopayments';

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

export const dodoPayments = new DodoPayments({
	bearerToken: env.DODO_PAYMENTS_API_KEY,
	environment: dev ? 'test_mode' : 'live_mode'
});

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	emailAndPassword: {
		enabled: true
	},
	plugins: [
		dodopayments({
			client: dodoPayments,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: [
						{
							productId: 'pdt_0NWdT3yqiyWXgLXcFgwhy',
							slug: 'monthly-subscription'
						}
					],
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
