import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resendSend } = vi.hoisted(() => ({
	resendSend: vi.fn().mockResolvedValue({ data: { id: 'test-email' }, error: null })
}));

vi.mock('resend', () => ({
	Resend: class {
		emails = { send: resendSend };
	}
}));

vi.mock('$env/dynamic/private', () => ({
	env: { RESEND_API_KEY: '[REDACTED_SECRET]' }
}));

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			user: {
				findFirst: vi.fn()
			}
		}
	}
}));

vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
		fatal: vi.fn()
	})
}));

import { emailLogoAttachments } from './email-branding';
import {
	getEmailOtpHtml,
	getPaymentFailedEmailHtml,
	getPaymentReceiptEmailHtml,
	getResetPasswordEmailHtml,
	getSubscriptionCancelledEmailHtml,
	getSubscriptionExpiringEmailHtml,
	getTwoFactorEmailHtml,
	getVerificationEmailHtml,
	getWelcomeEmailHtml,
	sendWelcomeEmail
} from './email';

describe('email branding', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('references logos through inline CID URLs instead of remote image URLs', () => {
		const html = getVerificationEmailHtml('https://aceblocker.com/verify');

		expect(html).toContain('src="cid:ace-blocker-logo-dark"');
		expect(html).toContain('src="cid:ace-blocker-logo-light"');
		expect(html).not.toContain('src="https://cdn.aceblocker.com/');
	});

	it('embeds the official PNG lockups as base64 inline Resend attachments', () => {
		expect(emailLogoAttachments).toHaveLength(2);
		for (const [attachment, filename, cid] of [
			[emailLogoAttachments[0], 'ace-lockup-dark.png', 'ace-blocker-logo-dark'],
			[emailLogoAttachments[1], 'ace-lockup-light.png', 'ace-blocker-logo-light']
		] as const) {
			expect(attachment).toMatchObject({
				filename,
				contentType: 'image/png',
				contentId: cid
			});
			expect(attachment.content).toMatch(/^[A-Za-z0-9+/=]+$/);
			expect(Buffer.from(attachment.content, 'base64').subarray(0, 8)).toEqual(
				Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
			);
			expect(attachment).not.toHaveProperty('path');
		}
	});

	it('includes the inline logo attachments on transactional sends', async () => {
		await sendWelcomeEmail('user@example.com', 'en');

		expect(resendSend).toHaveBeenCalledOnce();
		expect(resendSend).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'user@example.com',
				attachments: emailLogoAttachments
			})
		);
	});

	it('uses the shared Ace system-document layout across customer emails', () => {
		const templates = [
			getTwoFactorEmailHtml('123456'),
			getEmailOtpHtml('123456'),
			getVerificationEmailHtml('https://aceblocker.com/verify'),
			getWelcomeEmailHtml('https://aceblocker.com/download'),
			getResetPasswordEmailHtml('https://aceblocker.com/reset'),
			getPaymentReceiptEmailHtml('en', {
				amountMinor: 399,
				currency: 'USD',
				processedAt: new Date('2026-10-04T12:00:00Z'),
				subscriptionId: 'sub_preview'
			}),
			getSubscriptionExpiringEmailHtml('Oct 31, 2026', 'https://aceblocker.com/get-pro'),
			getSubscriptionCancelledEmailHtml('Oct 31, 2026'),
			getPaymentFailedEmailHtml('https://aceblocker.com/account')
		];

		for (const html of templates) {
			expect(html).toContain('class="email-document"');
			expect(html).toContain('text-align:left');
			expect(html).toContain('width="132"');
			expect(html).toContain('@media only screen and (max-width: 620px)');
			expect(html).not.toContain('height: 4px; background-color: #D97706');
			expect(html).not.toContain('border-radius: 16px');
		}
	});

	it('renders the payment confirmation as a state document with structured facts', () => {
		const html = getPaymentReceiptEmailHtml('en', {
			amountMinor: 399,
			currency: 'USD',
			processedAt: new Date('2026-10-04T12:00:00Z'),
			subscriptionId: 'sub_preview'
		});

		expect(html).toContain('Ace Blocker Pro is active');
		expect(html).toContain(
			'Your Pro access is active. The payment was processed successfully.'
		);
		expect(html).toContain('Plan');
		expect(html).toContain('Ace Blocker Pro');
		expect(html).toContain('Status');
		expect(html).toContain('Active');
		expect(html).toContain('Amount');
		expect(html).toContain('$3.99');
		expect(html).toContain('Processed');
		expect(html).toContain('Oct 4, 2026');
		expect(html).toContain('Subscription ID');
		expect(html).toContain('sub_preview');
		expect(html).toContain('mailto:support@aceblocker.com');
		expect(html).not.toContain('Thank you for your payment');
	});
});
