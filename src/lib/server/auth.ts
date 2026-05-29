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
import { createLogger } from './logger';

// Use process.env so Better Auth CLI (`auth generate`) can resolve these
// without needing SvelteKit's $app/environment or $env/static/private aliases.
const isProduction = process.env.NODE_ENV === 'production';

const dodoProducts: Product[] = isProduction
	? [
			{ productId: 'pdt_PUT_PROD_MONTHLY_ID_HERE', slug: 'ace_blocker_monthly' },
			{ productId: 'pdt_PUT_PROD_YEARLY_ID_HERE', slug: 'ace_blocker_yearly' }
		]
	: [
			{ productId: 'pdt_0NXOnI40qSEVOqAnCUwmm', slug: 'ace_blocker_monthly' },
			{ productId: 'pdt_0NYXyjMDNixJ55IDOC42c', slug: 'ace_blocker_yearly' }
		];

export const dodoPayments = new DodoPayments({
	bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
	environment: 'test_mode'
});

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	rateLimit: {
		enabled: isProduction,
		window: 5 * 60,
		max: 50
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url, token }, request) => {
			const log = createLogger('auth:email-verification');
			const locale = (user as any).locale ?? 'en';

			try {
				const result = await resend.emails.send({
					from: 'noreply@aceblocker.com',
					to: user.email,
					subject: m.email_verification_subject(locale),
					html: getVerificationEmailHtml(url, locale)
				});

				if (result.error) {
					log.error({ err: result.error }, 'Failed to send verification email');
				} else {
					log.info({ messageId: result.data?.id }, 'Verification email sent');
				}
			} catch (err) {
				log.error({ err }, 'Exception while sending verification email');
			}
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
					const log = createLogger('auth:2fa-otp');
					const locale = (user as any).locale ?? 'en';

					try {
						const result = await resend.emails.send({
							from: 'noreply@aceblocker.com',
							to: user.email,
							subject: m.email_2fa_subject(locale),
							html: getTwoFactorEmailHtml(otp, locale)
						});

						if (result.error) {
							log.error({ err: result.error }, 'Failed to send 2FA OTP email');
						} else {
							log.info({ messageId: result.data?.id }, '2FA OTP email sent');
						}
					} catch (err) {
						log.error({ err }, 'Exception while sending 2FA OTP email');
					}
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
					webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET!,

					onPayload: async (payload) => {
						const log = createLogger('auth:dodo-webhook');
						log.info({ type: payload.type }, 'DodoPayments webhook received');
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
