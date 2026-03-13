import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { admin, apiKey, openAPI, twoFactor } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { dodopayments, checkout, webhooks, type Product } from '@dodopayments/better-auth';
import DodoPayments from 'dodopayments';
import { resend } from './email';
import { updateProExpiration, clearProExpiration } from './pro';

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
		},
		autoSignInAfterVerification: true
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					if (user.email === env.ADMIN_EMAIL) {
						return {
							data: {
								...user,
								role: 'admin',
								twoFactorEnabled: true
							}
						};
					}
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
						from: 'security@aceblocker.com',
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
					products: JSON.parse(env.DODO_PAYMENTS_PRODUCTS!) as Product[],
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

if (dev) {
	(async () => {
		try {
			const existingUser = await db.query.user.findFirst({
				where: (user, { eq }) => eq(user.email, 'dev@example.com')
			});

			const devProExpiration = new Date('2099-12-31T23:59:59Z');

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
					.set({
						role: 'admin',
						emailVerified: true,
						proStatusCachedAt: new Date(),
						proExpiration: devProExpiration
					})
					.where(eq(user.email, 'dev@example.com'));

				console.log('✅ Created default dev user: dev@example.com / dev-password');
			} else if (
				existingUser.role !== 'admin' ||
				!existingUser.emailVerified ||
				!existingUser.proStatusCachedAt
			) {
				await db
					.update(user)
					.set({
						role: 'admin',
						emailVerified: true,
						proStatusCachedAt: new Date(),
						proExpiration: devProExpiration
					})
					.where(eq(user.email, 'dev@example.com'));
				console.log('✅ Updated dev user to admin, verified email, and set pro status');
			}
		} catch (e) {
			console.error('❌ Error in dev user seeding:', e);
		}
	})();
}

