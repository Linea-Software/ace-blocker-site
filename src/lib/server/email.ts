import 'dotenv/config';
import { Resend } from 'resend';
import type { Locale } from './messages';
import { RESEND_API_KEY } from '$env/static/private';
import { m as pm } from '$lib/paraglide/messages';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { createLogger } from '$lib/server/logger';
import { DARK_LOGO_CID, LIGHT_LOGO_CID, emailLogoAttachments } from './email-branding';

export const resend = new Resend(RESEND_API_KEY);

const log = createLogger('email');

/** Base site URL for email links (download, renewal, payment update). */
const siteUrl = (process.env.PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

// ── Shared email HTML shell ───────────────────────────────────────────────────

const emailHead = `<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  @media (prefers-color-scheme: light) {
    .email-body     { background-color: #F8FAFC !important; }
    .email-card     { background-color: #FFFFFF !important; border-color: #E2E8F0 !important; }
    .email-heading  { color: #0F172A !important; }
    .email-text     { color: #475569 !important; }
    .email-otp-box  { background-color: #F1F5F9 !important; border-color: #CBD5E1 !important; }
    .email-otp-code { color: #0F172A !important; }
    .email-divider  { border-top-color: #E2E8F0 !important; }
    .email-footer   { color: #94A3B8 !important; }
    .email-logo-dark  { display: none !important; }
    .email-logo-light { display: block !important; }
  }
</style>
</head>`;

function logoHtml(): string {
	return `
                    <!-- Dark mode default -->
                    <img class="email-logo-dark"
                         src="cid:${DARK_LOGO_CID}"
                         alt="Ace Blocker"
                         width="180"
                         height="42"
                         style="display:block; margin:0 auto; width:180px; height:auto; border:0;" />
                    <!-- Light mode override -->
                    <img class="email-logo-light"
                         src="cid:${LIGHT_LOGO_CID}"
                         alt="Ace Blocker"
                         width="180"
                         height="42"
                         style="display:none; margin:0 auto; width:180px; height:auto; border:0;" />`;
}

// ── Email templates (all use Paraglide for body/footer/button content) ────────

export function getTwoFactorEmailHtml(otpCode: string, locale: Locale = 'en'): string {
	const body = pm.email_2fa_body({}, { locale: locale as any });
	const footer = pm.email_2fa_footer({}, { locale: locale as any });

	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0;padding:0;">
    <div class="email-body" style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">${logoHtml()}
                </div>

                <p class="email-text" style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 32px; font-weight: 400;">
                    ${body}
                </p>

                <div class="email-otp-box" style="background-color: #0B0F19; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                    <span class="email-otp-code" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 38px; font-weight: 700; color: #F8FAFC; letter-spacing: 0.25em;">
                        ${otpCode}
                    </span>
                </div>

                <hr class="email-divider" style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />

                <p class="email-footer" style="font-size: 13px; line-height: 20px; color: #64748B; margin: 0;">
                    ${footer}
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export function getEmailOtpHtml(otpCode: string, locale: Locale = 'en'): string {
	const body = pm.email_otp_body({ otp: otpCode }, { locale: locale as any });
	const footer = pm.email_2fa_footer({}, { locale: locale as any });

	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0;padding:0;">
    <div class="email-body" style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">${logoHtml()}
                </div>

                <p class="email-text" style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 32px; font-weight: 400;">
                    ${body}
                </p>

                <div class="email-otp-box" style="background-color: #0B0F19; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                    <span class="email-otp-code" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 38px; font-weight: 700; color: #F8FAFC; letter-spacing: 0.25em;">
                        ${otpCode}
                    </span>
                </div>

                <hr class="email-divider" style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />

                <p class="email-footer" style="font-size: 13px; line-height: 20px; color: #64748B; margin: 0;">
                    ${footer}
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export function getVerificationEmailHtml(
	verifyUrl: string,
	locale: Locale = 'en'
): string {
	const body = pm.email_verification_body({}, { locale: locale as any });
	const button = pm.email_verification_button({}, { locale: locale as any });
	const footer = pm.email_verification_footer({}, { locale: locale as any });

	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0;padding:0;">
    <div class="email-body" style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">${logoHtml()}
                </div>

                <p class="email-text" style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 36px; font-weight: 400;">
                    ${body}
                </p>

                <div style="margin-bottom: 36px;">
                    <a href="${verifyUrl}" style="display: inline-block; background-color: #D97706; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none; padding: 16px 36px; border-radius: 10px;">
                        ${button}
                    </a>
                </div>

                <hr class="email-divider" style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />

                <p class="email-footer" style="font-size: 13px; line-height: 20px; color: #64748B; margin: 0;">
                    ${footer}
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// ── Welcome email (new) ───────────────────────────────────────────────────────

export function getWelcomeEmailHtml(
	downloadUrl: string,
	locale: Locale = 'en'
): string {
	const body = pm.email_welcome_body({}, { locale: locale as any });
	const button = pm.email_welcome_button({}, { locale: locale as any });

	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0;padding:0;">
    <div class="email-body" style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">${logoHtml()}
                </div>

                <p class="email-text" style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 36px; font-weight: 400;">
                    ${body}
                </p>

                <div style="margin-bottom: 36px;">
                    <a href="${downloadUrl}" style="display: inline-block; background-color: #D97706; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none; padding: 16px 36px; border-radius: 10px;">
                        ${button}
                    </a>
                </div>

                <hr class="email-divider" style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />
            </div>
        </div>
    </div>
</body>
</html>`;
}

// ── Password reset (new) ──────────────────────────────────────────────────────

export function getResetPasswordEmailHtml(
	resetUrl: string,
	locale: Locale = 'en'
): string {
	const body = pm.email_reset_password_body({}, { locale: locale as any });
	const button = pm.email_reset_password_button({}, { locale: locale as any });
	const footer = pm.email_reset_password_footer({}, { locale: locale as any });

	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0;padding:0;">
    <div class="email-body" style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">${logoHtml()}
                </div>

                <p class="email-text" style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 36px; font-weight: 400;">
                    ${body}
                </p>

                <div style="margin-bottom: 36px;">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #D97706; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none; padding: 16px 36px; border-radius: 10px;">
                        ${button}
                    </a>
                </div>

                <hr class="email-divider" style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />

                <p class="email-footer" style="font-size: 13px; line-height: 20px; color: #64748B; margin: 0;">
                    ${footer}
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// ── Payment receipt (new) ─────────────────────────────────────────────────────

export function getPaymentReceiptEmailHtml(
	locale: Locale = 'en'
): string {
	const body = pm.email_payment_receipt_body({}, { locale: locale as any });
	const footer = pm.email_payment_receipt_footer({}, { locale: locale as any });

	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0;padding:0;">
    <div class="email-body" style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">${logoHtml()}
                </div>

                <p class="email-text" style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 36px; font-weight: 400;">
                    ${body}
                </p>

                <hr class="email-divider" style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />

                <p class="email-footer" style="font-size: 13px; line-height: 20px; color: #64748B; margin: 0;">
                    ${footer}
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// ── Subscription expiring (new) ───────────────────────────────────────────────

export function getSubscriptionExpiringEmailHtml(
	expiryDate: string,
	renewUrl: string,
	locale: Locale = 'en'
): string {
	const body = pm.email_subscription_expiring_body({ date: expiryDate }, { locale: locale as any });
	const button = pm.email_subscription_expiring_button({}, { locale: locale as any });

	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0;padding:0;">
    <div class="email-body" style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">${logoHtml()}
                </div>

                <p class="email-text" style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 36px; font-weight: 400;">
                    ${body}
                </p>

                <div style="margin-bottom: 36px;">
                    <a href="${renewUrl}" style="display: inline-block; background-color: #D97706; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none; padding: 16px 36px; border-radius: 10px;">
                        ${button}
                    </a>
                </div>

                <hr class="email-divider" style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />
            </div>
        </div>
    </div>
</body>
</html>`;
}

// ── Subscription cancelled (new) ──────────────────────────────────────────────

export function getSubscriptionCancelledEmailHtml(
	expiryDate: string,
	locale: Locale = 'en'
): string {
	const body = pm.email_subscription_cancelled_body({ date: expiryDate }, { locale: locale as any });

	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0;padding:0;">
    <div class="email-body" style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">${logoHtml()}
                </div>

                <p class="email-text" style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 36px; font-weight: 400;">
                    ${body}
                </p>

                <hr class="email-divider" style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />
            </div>
        </div>
    </div>
</body>
</html>`;
}

// ── Payment failed (new) ──────────────────────────────────────────────────────

export function getPaymentFailedEmailHtml(
	updatePaymentUrl: string,
	locale: Locale = 'en'
): string {
	const body = pm.email_subscription_failed_body({}, { locale: locale as any });
	const button = pm.email_subscription_failed_button({}, { locale: locale as any });

	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0;padding:0;">
    <div class="email-body" style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">${logoHtml()}
                </div>

                <p class="email-text" style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 36px; font-weight: 400;">
                    ${body}
                </p>

                <div style="margin-bottom: 36px;">
                    <a href="${updatePaymentUrl}" style="display: inline-block; background-color: #D97706; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none; padding: 16px 36px; border-radius: 10px;">
                        ${button}
                    </a>
                </div>

                <hr class="email-divider" style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />
            </div>
        </div>
    </div>
</body>
</html>`;
}

// ── Sending helpers (wired into signup + Dodo webhook handlers) ────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
	try {
		const result = await resend.emails.send({
			from: 'noreply@aceblocker.com',
			to,
			subject,
			html,
			attachments: emailLogoAttachments
		});
		if (result.error) {
			log.error({ err: result.error, to }, 'Failed to send email');
		} else {
			log.info({ messageId: result.data?.id, to, subject }, 'Email sent');
		}
	} catch (err) {
		log.error({ err, to }, 'Exception while sending email');
	}
}

/** Look up a user's locale by email, defaulting to 'en'. */
export async function getLocaleForEmail(email: string): Promise<Locale> {
	try {
		const row = await db.query.user.findFirst({
			where: (u, { eq }) => eq(u.email, email),
			columns: { locale: true }
		});
		return (row?.locale as Locale) ?? 'en';
	} catch {
		return 'en';
	}
}

/** Welcome email — sent once after a real signup. */
export async function sendWelcomeEmail(email: string, locale: Locale = 'en'): Promise<void> {
	await sendEmail(
		email,
		pm.email_welcome_subject({}, { locale: locale as any }),
		getWelcomeEmailHtml(`${siteUrl}/download`, locale)
	);
}

/** Payment receipt — sent when a subscription becomes active / renews. */
export async function sendPaymentReceiptEmail(
	email: string,
	locale: Locale = 'en'
): Promise<void> {
	await sendEmail(
		email,
		pm.email_payment_receipt_subject({}, { locale: locale as any }),
		getPaymentReceiptEmailHtml(locale)
	);
}

/** Expiring soon — sent on a scheduled cancellation (access until expiry). */
export async function sendSubscriptionExpiringEmail(
	email: string,
	expiryDate: Date,
	locale: Locale = 'en'
): Promise<void> {
	await sendEmail(
		email,
		pm.email_subscription_expiring_subject({}, { locale: locale as any }),
		getSubscriptionExpiringEmailHtml(
			expiryDate.toLocaleDateString(locale),
			`${siteUrl}/get-pro`,
			locale
		)
	);
}

/** Cancelled — sent when a subscription ends without a renewal. */
export async function sendSubscriptionCancelledEmail(
	email: string,
	expiryDate: Date,
	locale: Locale = 'en'
): Promise<void> {
	await sendEmail(
		email,
		pm.email_subscription_cancelled_subject({}, { locale: locale as any }),
		getSubscriptionCancelledEmailHtml(expiryDate.toLocaleDateString(locale), locale)
	);
}

/** Payment failed — sent when a renewal payment could not be processed. */
export async function sendPaymentFailedEmail(
	email: string,
	locale: Locale = 'en'
): Promise<void> {
	await sendEmail(
		email,
		pm.email_subscription_failed_subject({}, { locale: locale as any }),
		getPaymentFailedEmailHtml(`${siteUrl}/account`, locale)
	);
}
