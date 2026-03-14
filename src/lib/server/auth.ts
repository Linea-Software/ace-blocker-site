import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { admin, apiKey, openAPI, twoFactor } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { dodopayments, checkout, webhooks, type Product } from '@dodopayments/better-auth';
import DodoPayments from 'dodopayments';
import { resend } from './email';
import { updateProExpiration, clearProExpiration } from './pro';


const env = process.env;

if (!env.DODO_PAYMENTS_API_KEY) {
	throw new Error('DODO_PAYMENTS_API_KEY is not set');
}

if (!env.DODO_PAYMENTS_PRODUCTS) {
	throw new Error('DODO_PAYMENTS_PRODUCTS is not set');
}

if (!env.DODO_PAYMENTS_WEBHOOK_SECRET) {
	throw new Error('DODO_PAYMENTS_WEBHOOK_SECRET is not set');
}

const dodoProducts = JSON.parse(env.DODO_PAYMENTS_PRODUCTS) as Product[];

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
		},
		autoSignInAfterVerification: true
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					return { data: user };
				}
			},
			update: {
				before: async (user, context) => {
					// user is the data being updated
					if ('twoFactorEnabled' in user && user.twoFactorEnabled === false) {
						// If there's an active session, check if the session user is the admin
						// In Better Auth hooks, we can check the context
						const session = await auth.api.getSession({
							headers: context?.request?.headers || new Headers()
						});
						if (session?.user.email === env.ADMIN_EMAIL) {
							// Force it back to true
							return {
								data: {
									...user,
									twoFactorEnabled: true
								}
							};
						}
					}
					return { data: user };
				}
			}
		}
	},
	plugins: [
		admin(),
		apiKey({
			enableSessionForAPIKeys: true
		}),
		openAPI(),
		twoFactor({
			issuer: 'Ace Blocker',
			otpOptions: {
				sendOTP: async ({ user, otp }) => {
					await resend.emails.send({
						from: 'noreply@aceblocker.com',
						to: user.email,
						subject: 'Your 2FA Code',
						text: `Your security code is: ${otp}`
					});
				}
			}
		}),
		dodopayments({
			client: dodoPayments,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: dodoProducts,
					successUrl: '/dashboard/success',
					authenticatedUsersOnly: true
				}),
				webhooks({
					webhookKey: env.DODO_PAYMENTS_WEBHOOK_SECRET!,

					onPayload: async (payload) => {
						console.log('📦 Received webhook:', payload.type);
					},

					// ── Pro activation events ─────────────────────────────────────────────
					// Set proExpiration to next_billing_date and bust the cache.

					onSubscriptionActive: async (payload) => {
						await updateProExpiration(payload.data.customer.email, payload.data.next_billing_date);
					},
					onSubscriptionRenewed: async (payload) => {
						await updateProExpiration(payload.data.customer.email, payload.data.next_billing_date);
					},
					onSubscriptionPlanChanged: async (payload) => {
						await updateProExpiration(payload.data.customer.email, payload.data.next_billing_date);
					},
					onSubscriptionUpdated: async (payload) => {
						// Only activate if still active after the update
						if (payload.data.status === 'active') {
							await updateProExpiration(payload.data.customer.email, payload.data.next_billing_date);
						} else {
							await clearProExpiration(payload.data.customer.email);
						}
					},

					// ── Pro deactivation events ───────────────────────────────────────────
					// Clear proExpiration so the next API call re-checks DodoPayments.

					onSubscriptionCancelled: async (payload) => {
						await clearProExpiration(payload.data.customer.email);
					},
					onSubscriptionFailed: async (payload) => {
						await clearProExpiration(payload.data.customer.email);
					},
					onSubscriptionExpired: async (payload) => {
						await clearProExpiration(payload.data.customer.email);
					},
					onSubscriptionPaused: async (payload) => {
						await clearProExpiration(payload.data.customer.email);
					},
					onSubscriptionOnHold: async (payload) => {
						await clearProExpiration(payload.data.customer.email);
					}
				})
			]
		})
	]
});