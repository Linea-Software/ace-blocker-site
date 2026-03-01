import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { admin, apiKey, openAPI } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { dodopayments, checkout, webhooks, type Product } from '@dodopayments/better-auth';
import DodoPayments from 'dodopayments';
import { resend } from './email';

//import { dev } from '$app/environment';
import { user } from './db/schema';
import { eq } from 'drizzle-orm';

const env = process.env;
const dev = import.meta.env.DEV;

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
	environment: 'test_mode'
});

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url, token }, request) => {
			const result = await resend.emails.send({
				from: 'noreply@aceblocker.com',
				to: user.email,
				subject: 'Verify your email',
				text: `Click the link to verify your email: ${url}`
			});

			console.log(result);
		}
	},
	plugins: [
		admin(),
		apiKey({
			enableSessionForAPIKeys: true
		}),
		openAPI(),
		dodopayments({
			client: dodoPayments,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: JSON.parse(env.DODO_PAYMENTS_PRODUCTS!) as Product[],
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

if (dev) {
	(async () => {
		try {
			const existingUser = await db.query.user.findFirst({
				where: (user, { eq }) => eq(user.email, 'dev@example.com')
			});

			if (!existingUser) {
				console.log('⏳ Creating default dev user...');
				await auth.api.signUpEmail({
					body: {
						email: 'dev@example.com',
						password: 'dev-password',
						name: 'Dev User'
					}
				});

				await db
					.update(user)
					.set({ role: 'admin', emailVerified: true })
					.where(eq(user.email, 'dev@example.com'));

				console.log('✅ Created default dev user: dev@example.com / dev-password');
			} else if (existingUser.role !== 'admin' || !existingUser.emailVerified) {
				await db
					.update(user)
					.set({ role: 'admin', emailVerified: true })
					.where(eq(user.email, 'dev@example.com'));
				console.log('✅ Updated dev user to admin and verified email');
			}
		} catch (e) {
			console.error('❌ Error in dev user seeding:', e);
		}
	})();
}
