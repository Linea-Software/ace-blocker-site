import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resendSend } = vi.hoisted(() => ({
	resendSend: vi.fn().mockResolvedValue({ data: { id: 'test-email' }, error: null })
}));

vi.mock('resend', () => ({
	Resend: class {
		emails = { send: resendSend };
	}
}));

vi.mock('$env/static/private', () => ({
	RESEND_API_KEY: '[REDACTED_SECRET]'
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
import { getVerificationEmailHtml, sendWelcomeEmail } from './email';

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

	it('defines both logo images as inline Resend attachments', () => {
		expect(emailLogoAttachments).toEqual([
			{
				path: 'https://cdn.aceblocker.com/dark-full-logo.png',
				filename: 'dark-full-logo.png',
				contentType: 'image/png',
				contentId: 'ace-blocker-logo-dark'
			},
			{
				path: 'https://cdn.aceblocker.com/light-full-logo.png',
				filename: 'light-full-logo.png',
				contentType: 'image/png',
				contentId: 'ace-blocker-logo-light'
			}
		]);
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
});
