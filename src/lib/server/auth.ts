import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { admin, openAPI, twoFactor, emailOTP } from 'better-auth/plugins';
import { apiKey } from '@better-auth/api-key';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { dodopayments, checkout, webhooks, type Product } from '@dodopayments/better-auth';
import DodoPayments from 'dodopayments';
import {
	getTwoFactorEmailHtml,
	getVerificationEmailHtml,
	getEmailOtpHtml,
	getLocaleForEmail,
	sendWelcomeEmail,
	sendPaymentReceiptEmail,
	sendSubscriptionExpiringEmail,
	sendSubscriptionCancelledEmail,
	sendPaymentFailedEmail,
	resend
} from './email';
import { updateProExpiration, clearProExpiration } from './pro';
import { shouldProcessWebhook } from './webhook-events';
import * as m from './messages';
import type { Locale } from './messages';
import { createLogger } from './logger';
import { dodoProducts } from './products';
import { isProduction } from '../env';

export const dodoPayments = new DodoPayments({
	bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
	environment: 'test_mode' // we're still in early dev phase, so we won't risk charging any user
});

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	user: {
		additionalFields: {
			// Hand-added locale column, kept in sync with the generated auth schema.
			locale: {
				type: 'string',
				required: false,
				defaultValue: 'en',
				input: false
			}
		}
	},
	rateLimit: {
		enabled: isProduction(),
		window: 5 * 60,
		max: 50
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user, context) => {
					// Welcome email for real signups only — the seeder and other
					// server-side user creation call auth.api.createUser without a
					// request, so their context is null.
					if (!context) return;
					const log = createLogger('auth:welcome-email');
					const locale = ((user as { locale?: string }).locale ?? 'en') as Locale;
					try {
						await sendWelcomeEmail(user.email, locale);
					} catch (err) {
						log.error({ err }, 'Failed to send welcome email');
					}
				}
			}
		}
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
			skipVerificationOnEnable: true,
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
					// emailOTP callback doesn't receive the user object, so we
					// default to 'en' for now. When locale propagation is added
					// at the caller level the string is ready.
					const locale: Locale = 'en';

					const subject = m.email_otp_subject(locale).replace('{otp}', otp);

					const html = getEmailOtpHtml(otp, locale);

					const result = await resend.emails.send({
						from: 'noreply@aceblocker.com',
						to: email,
						subject,
						html
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

					// Every handler below is gated by shouldProcessWebhook(): Dodo
					// retries deliveries until 2xx, and the same event must never
					// be applied twice (see src/lib/server/webhook-events.ts).

					// ── Pro activation events ─────────────────────────────────────────────
					// Set proExpiration to next_billing_date and bust the cache.

					onSubscriptionActive: async (payload) => {
						if (!(await shouldProcessWebhook(payload))) return;
						const email = payload.data.customer.email;
						if (payload.data.next_billing_date) {
							await updateProExpiration(email, payload.data.next_billing_date);
						}
						await sendPaymentReceiptEmail(email, await getLocaleForEmail(email));
					},
					onSubscriptionRenewed: async (payload) => {
						if (!(await shouldProcessWebhook(payload))) return;
						const email = payload.data.customer.email;
						if (payload.data.next_billing_date) {
							await updateProExpiration(email, payload.data.next_billing_date);
						}
						await sendPaymentReceiptEmail(email, await getLocaleForEmail(email));
					},
					onSubscriptionPlanChanged: async (payload) => {
						if (!(await shouldProcessWebhook(payload))) return;
						if (payload.data.next_billing_date) {
							await updateProExpiration(
								payload.data.customer.email,
								payload.data.next_billing_date
							);
						}
					},
					onSubscriptionUpdated: async (payload) => {
						if (!(await shouldProcessWebhook(payload))) return;
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
					// Note: a scheduled cancellation (cancel_at_next_billing_date) keeps
					// access until the period ends, matching the account page behavior.

					onSubscriptionCancelled: async (payload) => {
						if (!(await shouldProcessWebhook(payload))) return;
						const email = payload.data.customer.email;
						if (
							payload.data.cancel_at_next_billing_date &&
							payload.data.next_billing_date
						) {
							// Scheduled cancellation: access continues until the
							// period ends — tell the user it is expiring.
							await updateProExpiration(email, payload.data.next_billing_date);
							await sendSubscriptionExpiringEmail(
								email,
								payload.data.next_billing_date,
								await getLocaleForEmail(email)
							);
						} else {
							await clearProExpiration(email);
							await sendSubscriptionCancelledEmail(
								email,
								payload.data.next_billing_date ?? new Date(),
								await getLocaleForEmail(email)
							);
						}
					},
					onSubscriptionFailed: async (payload) => {
						if (!(await shouldProcessWebhook(payload))) return;
						const email = payload.data.customer.email;
						await clearProExpiration(email);
						await sendPaymentFailedEmail(email, await getLocaleForEmail(email));
					},
					onSubscriptionExpired: async (payload) => {
						if (!(await shouldProcessWebhook(payload))) return;
						await clearProExpiration(payload.data.customer.email);
					},
					onSubscriptionOnHold: async (payload) => {
						if (!(await shouldProcessWebhook(payload))) return;
						await clearProExpiration(payload.data.customer.email);
					},
					onSubscriptionPaused: async (payload) => {
						if (!(await shouldProcessWebhook(payload))) return;
						await clearProExpiration(payload.data.customer.email);
					}
				})
			]
		})
	]
});
