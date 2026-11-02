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

type EmailAction = {
	label: string;
	url: string;
	tone?: 'ink' | 'signal';
};

type EmailDetail = {
	label: string;
	value: string;
	tone?: 'default' | 'success' | 'danger' | 'signal';
};

type SystemEmailOptions = {
	locale: Locale;
	heading: string;
	bodyHtml: string;
	action?: EmailAction;
	details?: EmailDetail[];
	code?: string;
	footerHtml?: string;
};

export type PaymentReceiptDetails = {
	amountMinor?: number;
	currency?: string;
	processedAt?: Date;
	subscriptionId?: string;
};

const emailHead = `<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  @media (prefers-color-scheme: dark) {
    .email-body { background-color: #10100E !important; }
    .email-document { background-color: #1A1A17 !important; border-color: #3A3933 !important; }
    .email-heading { color: #FFFDF7 !important; }
    .email-text { color: #D7D2C7 !important; }
    .email-muted { color: #A7A59D !important; }
    .email-divider { border-top-color: #3A3933 !important; }
    .email-detail-row { border-top-color: #3A3933 !important; }
    .email-detail-label { color: #A7A59D !important; }
    .email-detail-value { color: #FFFDF7 !important; }
    .email-code { color: #FFFDF7 !important; border-color: #4A4942 !important; background-color: #22221E !important; }
    .email-action-ink { background-color: #FFFDF7 !important; color: #10100E !important; }
    .email-footer-link { color: #D7D2C7 !important; }
    .email-logo-light { display: none !important; }
    .email-logo-dark { display: block !important; }
  }

  @media only screen and (max-width: 620px) {
    .email-body-cell { padding: 16px 10px !important; }
    .email-document-cell { padding: 28px 22px !important; }
    .email-heading { font-size: 27px !important; line-height: 31px !important; }
    .email-detail-label,
    .email-detail-value {
      display: block !important;
      width: 100% !important;
      text-align: left !important;
    }
    .email-detail-value { padding-top: 3px !important; }
    .email-action { display: block !important; text-align: center !important; }
    .email-code { font-size: 31px !important; letter-spacing: 0.16em !important; }
  }
</style>
</head>`;

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

function logoHtml(locale: Locale): string {
	const alt = escapeHtml(pm.email_app_name({}, { locale: locale as any }));

	return `
<img class="email-logo-light"
     src="cid:${LIGHT_LOGO_CID}"
     alt="${alt}"
     width="132"
     height="40"
     style="display:block; width:132px; height:auto; border:0;" />
<img class="email-logo-dark"
     src="cid:${DARK_LOGO_CID}"
     alt="${alt}"
     width="132"
     height="40"
     style="display:none; width:132px; height:auto; border:0;" />`;
}

function actionHtml(action: EmailAction): string {
	const tone = action.tone ?? 'ink';
	const className =
		tone === 'signal' ? 'email-action email-action-signal' : 'email-action email-action-ink';
	const background = tone === 'signal' ? '#FFB000' : '#10100E';
	const color = '#10100E';

	return `<div style="margin-top:28px;">
<a class="${className}"
   href="${escapeHtml(action.url)}"
   style="display:inline-block; background-color:${background}; color:${tone === 'signal' ? color : '#FFFDF7'}; border:1px solid ${tone === 'signal' ? '#D58B00' : '#10100E'}; border-radius:3px; padding:12px 18px; font-family:'IBM Plex Sans', Arial, sans-serif; font-size:14px; line-height:20px; font-weight:600; text-decoration:none;">
  ${escapeHtml(action.label)}
</a>
</div>`;
}

function detailValueColor(tone: EmailDetail['tone']): string {
	switch (tone) {
		case 'success':
			return '#557E4B';
		case 'danger':
			return '#B83F36';
		case 'signal':
			return '#9B6600';
		default:
			return '#10100E';
	}
}

function detailsHtml(details: EmailDetail[]): string {
	if (details.length === 0) return '';

	const rows = details
		.map(
			(detail) => `<tr>
<td class="email-detail-row" colspan="2" style="border-top:1px solid #D7D2C7; padding:0; height:0; line-height:0; font-size:0;">&nbsp;</td>
</tr>
<tr>
<td class="email-detail-label" valign="top" style="width:42%; padding:11px 12px 11px 0; font-family:'IBM Plex Mono','SFMono-Regular',Consolas,monospace; font-size:11px; line-height:17px; letter-spacing:0.04em; text-transform:uppercase; color:#8B8A82;">
  ${escapeHtml(detail.label)}
</td>
<td class="email-detail-value" valign="top" style="width:58%; padding:11px 0; text-align:right; font-family:'IBM Plex Sans',Arial,sans-serif; font-size:14px; line-height:20px; font-weight:600; color:${detailValueColor(detail.tone)};">
  ${escapeHtml(detail.value)}
</td>
</tr>`
		)
		.join('');

	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin-top:28px; border-collapse:collapse;">
${rows}
<tr>
<td class="email-detail-row" colspan="2" style="border-top:1px solid #D7D2C7; padding:0; height:0; line-height:0; font-size:0;">&nbsp;</td>
</tr>
</table>`;
}

function codeHtml(code: string): string {
	return `<div class="email-code" style="margin-top:26px; padding:18px 0; border-top:1px solid #D7D2C7; border-bottom:1px solid #D7D2C7; background-color:#F7F4EC; font-family:'IBM Plex Mono','SFMono-Regular',Consolas,monospace; font-size:36px; line-height:44px; font-weight:600; letter-spacing:0.20em; color:#10100E; text-align:center;">
  ${escapeHtml(code)}
</div>`;
}

function renderSystemEmail({
	locale,
	heading,
	bodyHtml,
	action,
	details = [],
	code,
	footerHtml
}: SystemEmailOptions): string {
	const mainContent = `${bodyHtml ? `<div class="email-text" style="font-family:'IBM Plex Sans',Arial,sans-serif; font-size:15px; line-height:24px; color:#4C4B45;">${bodyHtml}</div>` : ''}${code ? codeHtml(code) : ''}${detailsHtml(details)}${action ? actionHtml(action) : ''}`;
	const footer = footerHtml
		? `<div class="email-divider" style="border-top:1px solid #D7D2C7; margin-top:30px; padding-top:18px;">
<p class="email-muted" style="margin:0; font-family:'IBM Plex Sans',Arial,sans-serif; font-size:12px; line-height:18px; color:#8B8A82;">${footerHtml}</p>
</div>`
		: '';

	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0; padding:0;">
<table class="email-body" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse; background-color:#F3F0E8;">
<tr>
<td class="email-body-cell" align="center" style="padding:32px 16px;">
  <table class="email-document" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:560px; border-collapse:separate; background-color:#FFFDF7; border:1px solid #D7D2C7; border-radius:4px;">
  <tr>
  <td class="email-document-cell" style="padding:34px 36px; text-align:left;">
    <div style="margin:0 0 24px 0;">${logoHtml(locale)}</div>
    <div class="email-divider" style="border-top:1px solid #D7D2C7; margin:0 0 26px 0;"></div>
    <h1 class="email-heading" style="margin:0 0 14px 0; font-family:'IBM Plex Sans Condensed','Arial Narrow',Arial,sans-serif; font-size:31px; line-height:35px; font-weight:600; letter-spacing:-0.01em; color:#10100E;">
      ${escapeHtml(heading)}
    </h1>
    ${mainContent}
    ${footer}
  </td>
  </tr>
  </table>
</td>
</tr>
</table>
</body>
</html>`;
}

function supportLink(locale: Locale): string {
	const label = escapeHtml(pm.email_support_link({}, { locale: locale as any }));
	return `<a class="email-footer-link" href="mailto:support@aceblocker.com" style="color:#4C4B45; text-decoration:underline;">${label}</a>`;
}

function formatDate(date: Date, locale: Locale): string {
	return date.toLocaleDateString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

function formatAmount(amountMinor: number, currency: string, locale: Locale): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency
	}).format(amountMinor / 100);
}

// ── Customer-facing transactional email templates ──────────────────────────────

export function getTwoFactorEmailHtml(otpCode: string, locale: Locale = 'en'): string {
	return renderSystemEmail({
		locale,
		heading: pm.email_2fa_title({}, { locale: locale as any }),
		bodyHtml: pm.email_2fa_body({}, { locale: locale as any }),
		code: otpCode,
		footerHtml: pm.email_2fa_footer({}, { locale: locale as any })
	});
}

export function getEmailOtpHtml(otpCode: string, locale: Locale = 'en'): string {
	return renderSystemEmail({
		locale,
		heading: pm.email_otp_title({}, { locale: locale as any }),
		bodyHtml: pm.email_otp_body({ otp: otpCode }, { locale: locale as any }),
		code: otpCode,
		footerHtml: pm.email_2fa_footer({}, { locale: locale as any })
	});
}

export function getVerificationEmailHtml(verifyUrl: string, locale: Locale = 'en'): string {
	return renderSystemEmail({
		locale,
		heading: pm.email_verification_title({}, { locale: locale as any }),
		bodyHtml: pm.email_verification_body({}, { locale: locale as any }),
		action: {
			label: pm.email_verification_button({}, { locale: locale as any }),
			url: verifyUrl,
			tone: 'signal'
		},
		footerHtml: pm.email_verification_footer({}, { locale: locale as any })
	});
}

export function getWelcomeEmailHtml(downloadUrl: string, locale: Locale = 'en'): string {
	return renderSystemEmail({
		locale,
		heading: pm.email_welcome_title({}, { locale: locale as any }),
		bodyHtml: pm.email_welcome_body({}, { locale: locale as any }),
		action: {
			label: pm.email_welcome_button({}, { locale: locale as any }),
			url: downloadUrl
		}
	});
}

export function getResetPasswordEmailHtml(resetUrl: string, locale: Locale = 'en'): string {
	return renderSystemEmail({
		locale,
		heading: pm.email_reset_password_title({}, { locale: locale as any }),
		bodyHtml: pm.email_reset_password_body({}, { locale: locale as any }),
		action: {
			label: pm.email_reset_password_button({}, { locale: locale as any }),
			url: resetUrl,
			tone: 'signal'
		},
		footerHtml: pm.email_reset_password_footer({}, { locale: locale as any })
	});
}

export function getPaymentReceiptEmailHtml(
	locale: Locale = 'en',
	receipt: PaymentReceiptDetails = {}
): string {
	const details: EmailDetail[] = [
		{
			label: pm.email_detail_plan({}, { locale: locale as any }),
			value: pm.email_plan_pro({}, { locale: locale as any })
		},
		{
			label: pm.email_detail_status({}, { locale: locale as any }),
			value: pm.email_status_active({}, { locale: locale as any }),
			tone: 'success'
		}
	];

	if (receipt.amountMinor !== undefined && receipt.currency) {
		details.push({
			label: pm.email_detail_amount({}, { locale: locale as any }),
			value: formatAmount(receipt.amountMinor, receipt.currency, locale)
		});
	}

	details.push({
		label: pm.email_detail_processed({}, { locale: locale as any }),
		value: formatDate(receipt.processedAt ?? new Date(), locale)
	});

	if (receipt.subscriptionId) {
		details.push({
			label: pm.email_detail_subscription_id({}, { locale: locale as any }),
			value: receipt.subscriptionId
		});
	}

	return renderSystemEmail({
		locale,
		heading: pm.email_payment_receipt_title({}, { locale: locale as any }),
		bodyHtml: pm.email_payment_receipt_body({}, { locale: locale as any }),
		details,
		footerHtml: `${escapeHtml(pm.email_payment_receipt_footer({}, { locale: locale as any }))} ${supportLink(locale)}`
	});
}

export function getSubscriptionExpiringEmailHtml(
	expiryDate: string,
	renewUrl: string,
	locale: Locale = 'en'
): string {
	return renderSystemEmail({
		locale,
		heading: pm.email_subscription_expiring_title({}, { locale: locale as any }),
		bodyHtml: pm.email_subscription_expiring_body(
			{ date: expiryDate },
			{ locale: locale as any }
		),
		details: [
			{
				label: pm.email_detail_plan({}, { locale: locale as any }),
				value: pm.email_plan_pro({}, { locale: locale as any })
			},
			{
				label: pm.email_detail_status({}, { locale: locale as any }),
				value: pm.email_status_scheduled_to_end({}, { locale: locale as any }),
				tone: 'signal'
			},
			{
				label: pm.email_detail_access_until({}, { locale: locale as any }),
				value: expiryDate
			}
		],
		action: {
			label: pm.email_subscription_expiring_button({}, { locale: locale as any }),
			url: renewUrl,
			tone: 'signal'
		},
		footerHtml: `${escapeHtml(pm.email_support_footer({}, { locale: locale as any }))} ${supportLink(locale)}`
	});
}

export function getSubscriptionCancelledEmailHtml(
	expiryDate: string,
	locale: Locale = 'en'
): string {
	return renderSystemEmail({
		locale,
		heading: pm.email_subscription_cancelled_title({}, { locale: locale as any }),
		bodyHtml: pm.email_subscription_cancelled_body(
			{ date: expiryDate },
			{ locale: locale as any }
		),
		details: [
			{
				label: pm.email_detail_plan({}, { locale: locale as any }),
				value: pm.email_plan_pro({}, { locale: locale as any })
			},
			{
				label: pm.email_detail_status({}, { locale: locale as any }),
				value: pm.email_status_cancelled({}, { locale: locale as any })
			},
			{
				label: pm.email_detail_access_until({}, { locale: locale as any }),
				value: expiryDate
			}
		],
		footerHtml: `${escapeHtml(pm.email_support_footer({}, { locale: locale as any }))} ${supportLink(locale)}`
	});
}

export function getPaymentFailedEmailHtml(updatePaymentUrl: string, locale: Locale = 'en'): string {
	return renderSystemEmail({
		locale,
		heading: pm.email_subscription_failed_title({}, { locale: locale as any }),
		bodyHtml: pm.email_subscription_failed_body({}, { locale: locale as any }),
		details: [
			{
				label: pm.email_detail_plan({}, { locale: locale as any }),
				value: pm.email_plan_pro({}, { locale: locale as any })
			},
			{
				label: pm.email_detail_status({}, { locale: locale as any }),
				value: pm.email_status_payment_action({}, { locale: locale as any }),
				tone: 'danger'
			}
		],
		action: {
			label: pm.email_subscription_failed_button({}, { locale: locale as any }),
			url: updatePaymentUrl,
			tone: 'signal'
		},
		footerHtml: `${escapeHtml(pm.email_support_footer({}, { locale: locale as any }))} ${supportLink(locale)}`
	});
}

// ── Sending helpers (wired into signup + Dodo webhook handlers) ────────────────

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

/** Payment confirmation — sent when a subscription becomes active / renews. */
export async function sendPaymentReceiptEmail(
	email: string,
	locale: Locale = 'en',
	receipt: PaymentReceiptDetails = {}
): Promise<void> {
	await sendEmail(
		email,
		pm.email_payment_receipt_subject({}, { locale: locale as any }),
		getPaymentReceiptEmailHtml(locale, receipt)
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
			formatDate(expiryDate, locale),
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
		getSubscriptionCancelledEmailHtml(formatDate(expiryDate, locale), locale)
	);
}

/** Payment failed — sent when a renewal payment could not be processed. */
export async function sendPaymentFailedEmail(email: string, locale: Locale = 'en'): Promise<void> {
	await sendEmail(
		email,
		pm.email_subscription_failed_subject({}, { locale: locale as any }),
		getPaymentFailedEmailHtml(`${siteUrl}/account`, locale)
	);
}
