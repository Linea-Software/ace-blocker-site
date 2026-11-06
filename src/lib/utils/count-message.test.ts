import { describe, expect, it, vi } from 'vitest';
import { countMessage } from './count-message';

describe('localized count messages', () => {
	it.each([
		[0, 'none'],
		[1, 'singular'],
		[2, 'plural'],
		[17, 'plural']
	] as const)('chooses the correct form for %i', (count, expected) => {
		const zero = vi.fn(() => 'none');
		const one = vi.fn(() => 'singular');
		const other = vi.fn(() => 'plural');
		expect(countMessage(count, zero, one, other)).toBe(expected);
		expect(zero.mock.calls.length + one.mock.calls.length + other.mock.calls.length).toBe(1);
	});
});

import * as m from '$lib/paraglide/messages';

it('renders Italian account counts for zero, one and many', () => {
	const values = [
		'Nessun account corrisponde alla ricerca.',
		'1 account corrisponde alla ricerca.',
		'3 account corrispondono alla ricerca.'
	];
	for (const [index, count] of [0, 1, 3].entries()) {
		expect(
			countMessage(
				count,
				() => m.admin_users_search_results_zero({}, { locale: 'it' }),
				() => m.admin_users_search_results_one({}, { locale: 'it' }),
				() => m.admin_users_search_results({ count }, { locale: 'it' })
			)
		).toBe(values[index]);
	}
});

it('handles zero and one visits and one-day trials', () => {
	expect(m.admin_metrics_weekly_visits_zero({}, { locale: 'it' })).toBe(
		'Nessuna visita negli ultimi 7 giorni'
	);
	expect(m.admin_metrics_weekly_visits_one({}, { locale: 'it' })).toBe(
		'1 visita negli ultimi 7 giorni'
	);
	expect(m.admin_metrics_weekly_visits({ count: 3 }, { locale: 'it' })).toBe(
		'3 visite negli ultimi 7 giorni'
	);
	expect(m.inline_checkout_trial_badge_one({}, { locale: 'it' })).toBe(
		'Prova gratuita di 1 giorno'
	);
	expect(m.inline_checkout_after_trial_one({}, { locale: 'en' })).toBe('After 1 day');
});
