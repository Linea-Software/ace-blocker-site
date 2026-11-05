import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { admin, openAPI, twoFactor, emailOTP } from 'better-auth/plugins';
import { apiKey } from '@better-auth/api-key';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as schema from './db/schema';
import { dodopayments, checkout, webhooks, type Product } from '@dodopayments/better-auth';
import DodoPayments from 'dodopayments';
import {
	getTwoFactorEmailHtml,
	getVerificationEmailHtml,
	getEmailOtpHtml,
	getResetPasswordEmailHtml,
	getLocaleForEmail,
	sendWelcomeEmail,
	sendPaymentReceiptEmail,
	sendSubscriptionExpiringEmail,
	sendSubscriptionCancelledEmail,
	sendPaymentFailedEmail,
	resend
} from './email';
import { emailLogoAttachments } from './email-branding';
import { handleUserCreatedAfter } from './auth-hooks';
import { updateProExpiration, clearProExpiration } from './pro';
import { processWebhookOnce } from './webhook-events';
import * as m from './messages';
import type { Locale } from './messages';
import { createLogger } from './logger';
import { dodoProducts } from './products';
import { getAuthRateLimitConfig } from './config/auth-security';
import { shouldCreateDodoCustomerOnSignUp } from './config/dodo';

export const dodoPayments = new DodoPayments({
	bearerToken: process.env.DODO_PAYMENTS_API_KEY ?? '',
	environment: 'test_mode' // we're still in early dev phase, so we won't risk charging any user
});

/**
 * API key extraction for the Better Auth apiKey plugin (release plan Step 2.10).
 *
 * The engine authenticates to the site API with either:
 *   - `x-api-key: <api-key>`   (content-updater / AceServerClient), or
 *   - `Authorization: Bearer <api-key>` (generated ace_server_api client).
 *
 * Better Auth's plugin only reads `x-api-key` by default; this getter keeps
 * that and additionally accepts the Bearer form so both engine clients can
 * authorize with the same key. Used together with `enableSessionForAPIKeys`.
 */
export function apiKeyGetter(ctx: { headers?: Headers | null }): string | null {
	const xApiKey = ctx.headers?.get('x-api-key');
	if (xApiKey) return xApiKey;

	const authorization = ctx.headers?.get('authorization');
	if (authorization?.startsWith('Bearer ')) {
		return authorization.slice('Bearer '.length);
	}

	return null;
}

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema
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
		enabled: getAuthRateLimitConfig().enabled,
		window: 5 * 60,
		max: 50
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url, token }, request) => {
			const log = createLogger('auth:password-reset');
			const locale = (user as any).locale ?? 'en';

			try {
				const result = await resend.emails.send({
					from: 'noreply@aceblocker.com',
					to: user.email,
					subject: m.email_reset_password_subject(locale),
					html: getResetPasswordEmailHtml(url, locale),
					attachments: emailLogoAttachments
				});

				if (result.error) {
					log.error({ err: result.error }, 'Failed to send password reset email');
				} else {
					log.info({ messageId: result.data?.id }, 'Password reset email sent');
				}
			} catch (err) {
				log.error({ err }, 'Exception while sending password reset email');
			}
		}
	},
	databaseHooks: {
		user: {
			create: {
				// Welcome email for real signups only — the seeder and other
				// server-side user creation call auth.api.createUser without a
				// request, so their context is null.
				after: handleUserCreatedAfter
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
					html: getVerificationEmailHtml(url, locale),
					attachments: emailLogoAttachments
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
			enableSessionForAPIKeys: true,
			// Engine compatibility: the content-updater client sends the API key
			// as `x-api-key`, while the generated ace_server_api client sends
			// `Authorization: Bearer <key>`. The default plugin getter only
			// reads x-api-key, so accept both forms.
			customAPIKeyGetter: apiKeyGetter
		}),
		openAPI(),
		twoFactor({
			issuer: m.email_app_name(),
			skipVerificationOnEnable: false,
			otpOptions: {
				sendOTP: async ({ user, otp }) => {
					const log = createLogger('auth:2fa-otp');
					const locale = (user as any).locale ?? 'en';

					try {
						const result = await resend.emails.send({
							from: 'noreply@aceblocker.com',
							to: user.email,
							subject: m.email_2fa_subject(locale),
							html: getTwoFactorEmailHtml(otp, locale),
							attachments: emailLogoAttachments
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
						html,
						attachments: emailLogoAttachments
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
			// Signup is independent of the Dodo API in development. Invalid/missing
			// test-mode credentials must not prevent a local account being created.
			createCustomerOnSignUp: shouldCreateDodoCustomerOnSignUp(),
			use: [
				checkout({
					products: dodoProducts,
					successUrl: '/checkout/completed',
					authenticatedUsersOnly: true
				}),
				webhooks({
					webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET ?? '',

					onPayload: async (payload) => {
						const log = createLogger('auth:dodo-webhook');
						log.info({ type: payload.type }, 'DodoPayments webhook received');
					},

					// Every handler below is gated by processWebhookOnce(): Dodo
					// retries deliveries until 2xx, and the same event must never
					// be applied twice (see src/lib/server/webhook-events.ts).

					// ── Pro activation events ─────────────────────────────────────────────
					// Set proExpiration to next_billing_date and bust the cache.

					onSubscriptionActive: async (payload) => {
						await processWebhookOnce(payload, async () => {
							const email = payload.data.customer.email;
							if (payload.data.next_billing_date) {
								await updateProExpiration(email, payload.data.next_billing_date);
							}
							await sendPaymentReceiptEmail(email, await getLocaleForEmail(email), {
								amountMinor: payload.data.recurring_pre_tax_amount,
								currency: payload.data.currency,
								processedAt: new Date(payload.timestamp),
								subscriptionId: payload.data.subscription_id
							});
						});
					},
					onSubscriptionRenewed: async (payload) => {
						await processWebhookOnce(payload, async () => {
							const email = payload.data.customer.email;
							if (payload.data.next_billing_date) {
								await updateProExpiration(email, payload.data.next_billing_date);
							}
							await sendPaymentReceiptEmail(email, await getLocaleForEmail(email), {
								amountMinor: payload.data.recurring_pre_tax_amount,
								currency: payload.data.currency,
								processedAt: new Date(payload.timestamp),
								subscriptionId: payload.data.subscription_id
							});
						});
					},
					onSubscriptionPlanChanged: async (payload) => {
						await processWebhookOnce(payload, async () => {
							if (payload.data.next_billing_date) {
								await updateProExpiration(
									payload.data.customer.email,
									payload.data.next_billing_date
								);
							}
						});
					},
					onSubscriptionUpdated: async (payload) => {
						await processWebhookOnce(payload, async () => {
							// Only activate if still active after the update
							if (
								payload.data.status === 'active' &&
								payload.data.next_billing_date
							) {
								await updateProExpiration(
									payload.data.customer.email,
									payload.data.next_billing_date
								);
							} else {
								await clearProExpiration(payload.data.customer.email);
							}
						});
					},

					// ── Pro deactivation events ───────────────────────────────────────────
					// Clear proExpiration so the next API call re-checks DodoPayments.
					// Note: a scheduled cancellation (cancel_at_next_billing_date) keeps
					// access until the period ends, matching the account page behavior.

					onSubscriptionCancelled: async (payload) => {
						await processWebhookOnce(payload, async () => {
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
						});
					},
					onSubscriptionFailed: async (payload) => {
						await processWebhookOnce(payload, async () => {
							const email = payload.data.customer.email;
							await clearProExpiration(email);
							await sendPaymentFailedEmail(email, await getLocaleForEmail(email));
						});
					},
					onSubscriptionExpired: async (payload) => {
						await processWebhookOnce(payload, async () => {
							await clearProExpiration(payload.data.customer.email);
						});
					},
					onSubscriptionOnHold: async (payload) => {
						await processWebhookOnce(payload, async () => {
							await clearProExpiration(payload.data.customer.email);
						});
					},
					onSubscriptionPaused: async (payload) => {
						await processWebhookOnce(payload, async () => {
							await clearProExpiration(payload.data.customer.email);
						});
					}
				})
			]
		})
	]
});
