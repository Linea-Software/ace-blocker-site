import { expect, test } from '@playwright/test';

test.describe('HTTPS device linking', () => {
	test('creates an expiring native challenge, restricts unapproved polling and cross-origin requests', async ({
		request
	}) => {
		const issued = await request.post('/api/device-link/start', { data: {} });
		expect(issued.status()).toBe(200);
		expect(issued.headers()['cache-control']).toBe('no-store');
		const { deviceCode, userCode, interval, expiresIn, verificationUri } = await issued.json();
		expect(deviceCode).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(userCode).toMatch(/^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){2}$/);
		expect(interval).toBeGreaterThanOrEqual(5);
		expect(expiresIn).toBe(600);
		expect(verificationUri).toMatch(/\/connect$/);

		const first = await request.post('/api/device-link/poll', { data: { deviceCode } });
		expect(first.status()).toBe(202);
		const pending = await first.json();
		expect(pending.state).toBe('pending');
		expect(JSON.stringify(pending)).not.toContain('apiKey');

		const repeat = await request.post('/api/device-link/poll', { data: { deviceCode } });
		expect(repeat.status()).toBe(429);
		expect((await repeat.json()).state).toBe('slow_down');

		const invalid = await request.post('/api/device-link/poll', {
			data: { deviceCode: 'wrong' }
		});
		expect(invalid.status()).toBe(410);

		const anonymousApproval = await request.post('/api/device-link/approve', {
			data: { code: userCode },
			headers: { origin: 'http://localhost:5173' }
		});
		expect(anonymousApproval.status()).toBe(401);

		const crossOrigin = await request.post('/api/device-link/start', {
			data: {},
			headers: { origin: 'https://untrusted.example' }
		});
		expect(crossOrigin.status()).toBe(403);
	});

	test('renders a responsive verification page without launching the desktop app', async ({
		page
	}) => {
		for (const width of [390, 1366]) {
			await page.setViewportSize({ width, height: 850 });
			await page.goto('/connect', { waitUntil: 'networkidle' });
			await expect(page.getByRole('heading', { name: 'Connect Ace Blocker' })).toBeVisible();
			await expect(page.getByText(/Only approve a code that you can see/)).toBeVisible();
			await expect(page.getByRole('button', { name: 'Sign in to authorize' })).toBeVisible();
			await expect(page.getByTestId('device-link-form')).toBeVisible();
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth)
			).toBeLessThanOrEqual(width);
		}
	});

	test('forwards the desktop confirmation code through sign-in without approving it', async ({
		page
	}) => {
		const code = 'ABCD-EFGH-JKLM';
		const approvalRequests: string[] = [];
		page.on('request', (request) => {
			if (request.url().includes('/api/device-link/approve'))
				approvalRequests.push(request.url());
		});
		await page.goto(`/connect?code=${code}`, { waitUntil: 'networkidle' });
		await expect(page.locator('input[name="redirectTo"]')).toHaveValue(`/connect?code=${code}`);
		await page.getByRole('button', { name: 'Sign in to authorize' }).click();
		await expect(page).toHaveURL(/\/signin\?/);
		expect(new URL(page.url()).searchParams.get('redirectTo')).toBe(`/connect?code=${code}`);
		expect(approvalRequests).toHaveLength(0);
	});

	test('does not pass malformed confirmation codes into the sign-in redirect', async ({
		page
	}) => {
		await page.goto('/connect?code=invalid%26deviceCode%3Dsecret', {
			waitUntil: 'networkidle'
		});
		await expect(page.locator('input[name="redirectTo"]')).toHaveValue('/connect');
	});
});
