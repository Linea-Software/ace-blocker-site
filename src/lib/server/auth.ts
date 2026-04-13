import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { admin, openAPI, twoFactor } from 'better-auth/plugins';
import { apiKey } from '@better-auth/api-key';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { dodopayments, checkout, webhooks, type Product } from '@dodopayments/better-auth';
import DodoPayments from 'dodopayments';
import { getTwoFactorEmailHtml, getVerificationEmailHtml, resend } from './email';
import { updateProExpiration, clearProExpiration } from './pro';
import * as m from './messages';

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
	rateLimit: {
		enabled: env.NODE_ENV === 'production',
		window: 5 * 60,
		max: 50
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url, token }, request) => {
			const result = await resend.emails.send({
				from: 'noreply@aceblocker.com',
				to: user.email,
				subject: m.email_verification_subject(),
				html: getVerificationEmailHtml(url)
			});

			console.log(result);
		},
		autoSignInAfterVerification: true
	},
	plugins: [
		admin(),
		apiKey({
			enableSessionForAPIKeys: true
		}),
		openAPI(),
		twoFactor({
			issuer: m.email_app_name(),
			otpOptions: {
				sendOTP: async ({ user, otp }) => {
					await resend.emails.send({
						from: 'noreply@aceblocker.com',
						to: user.email,
						subject: m.email_2fa_subject(),
						html: getTwoFactorEmailHtml(otp)
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
					successUrl: '/checkout/completed',
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
						if (payload.data.next_billing_date) {
							await updateProExpiration(
								payload.data.customer.email,
								payload.data.next_billing_date
							);
						}
					},
					onSubscriptionRenewed: async (payload) => {
						if (payload.data.next_billing_date) {
							await updateProExpiration(
								payload.data.customer.email,
								payload.data.next_billing_date
							);
						}
					},
					onSubscriptionPlanChanged: async (payload) => {
						if (payload.data.next_billing_date) {
							await updateProExpiration(
								payload.data.customer.email,
								payload.data.next_billing_date
							);
						}
					},
					onSubscriptionUpdated: async (payload) => {
						// Only activate if still active after the update
						if (payload.data.status === 'active' && payload.data.next_billing_date) {
							await updateProExpiration(
								payload.data.customer.email,
								payload.data.next_billing_date
							);
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
					onSubscriptionOnHold: async (payload) => {
						await clearProExpiration(payload.data.customer.email);
					}
				})
			]
		})
	]
});
