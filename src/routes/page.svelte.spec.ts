import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('leads with category-first blocking language', async () => {
		render(Page, { data: { isPro: false, newRelease: null } });

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Block categories, not domains.' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Curated Categories' }))
			.toBeInTheDocument();
	});

	it('shows the current release version when the server marks it as new', async () => {
		render(Page, { data: { isPro: false, newRelease: { version: '1.2.3' } } });

		await expect.element(page.getByText('Ace Blocker 1.2.3 is now live')).toBeInTheDocument();
	});
});
