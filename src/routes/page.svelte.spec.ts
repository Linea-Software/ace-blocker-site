import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('keeps category-first blocking language in the redesigned homepage', async () => {
		render(Page, { data: { isPro: false, newRelease: null } });

		const heading = page.getByRole('heading', {
			level: 1,
			name: 'Block distracting websites'
		});
		await expect.element(heading).toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Your blocks run automatically' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Make websites less distracting' }))
			.toBeInTheDocument();
		await expect
			.element(
				page.getByRole('heading', {
					name: 'Block a category without maintaining a domain list.'
				})
			)
			.toBeInTheDocument();
		await expect
			.element(
				page.getByText(
					'Categories group known destinations so a rule can cover an entire category without maintaining a domain list by hand.'
				)
			)
			.toBeInTheDocument();
	});

	it('shows the current release version when the server marks it as new', async () => {
		render(Page, { data: { isPro: false, newRelease: { version: '1.2.3' } } });

		await expect.element(page.getByText('Ace Blocker 1.2.3 is now live')).toBeInTheDocument();
	});
});
