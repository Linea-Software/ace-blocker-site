import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { admin, openAPI, twoFactor, emailOTP } from 'better-auth/plugins';
import { apiKey } from '@better-auth/api-key';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { dodopayments, checkout, webhooks, type Product } from '@dodopayments/better-auth';
import DodoPayments from 'dodopayments';
import { getTwoFactorEmailHtml, getVerificationEmailHtml, resend } from './email';
import { updateProExpiration, clearProExpiration } from './pro';
import * as m from './messages';
import { createLogger } from './logger';
import { dodoProducts } from './products';

const isProduction = process.env.NODE_ENV === 'production';

export const dodoPayments = new DodoPayments({
	bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
	environment: 'test_mode' // we're still in early dev phase, so we won't risk charging any user
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
		emailOTP({
			async sendVerificationOTP({ email, otp, type }) {
				const log = createLogger('auth:email-otp');
				try {
					const result = await resend.emails.send({
						from: 'noreply@aceblocker.com',
						to: email,
						subject: `Your verification code: ${otp}`,
						html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`
					});
					if (result.error) {
						log.error({ err: result.error, type }, 'Failed to send OTP email');
					} else {
						log.info({ messageId: result.data?.id, type }, 'OTP email sent');
					}
				} catch (err) {
					log.error({ err, type }, 'Exception while sending OTP email');
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
