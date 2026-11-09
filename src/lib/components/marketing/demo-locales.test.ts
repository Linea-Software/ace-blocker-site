import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const locales = ['en', 'it', 'de', 'es'] as const;
const messages = Object.fromEntries(
	locales.map((locale) => [
		locale,
		JSON.parse(
			readFileSync(resolve(process.cwd(), 'messages', locale + '.json'), 'utf8')
		) as Record<string, string>
	])
) as Record<(typeof locales)[number], Record<string, string>>;

function placeholders(value: string) {
	return [...value.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)].map((match) => match[1]).sort();
}

describe('marketing walkthrough translations', () => {
	it('provides all feature and demo strings in each advertised locale', () => {
		const keys = Object.keys(messages.en).filter(
			(key) => key.startsWith('demo_') || key.startsWith('feature_')
		);
		expect(keys.length).toBeGreaterThan(95);
		for (const locale of locales) {
			for (const key of keys) {
				expect(messages[locale][key], locale + ':' + key).toBeTruthy();
			}
		}
	});

	it('preserves every interpolation argument in every locale', () => {
		const keys = Object.keys(messages.en).filter(
			(key) => key.startsWith('demo_') || key.startsWith('feature_')
		);
		for (const key of keys) {
			const expected = placeholders(messages.en[key]);
			for (const locale of locales) {
				expect(placeholders(messages[locale][key]), locale + ':' + key).toEqual(expected);
			}
		}
	});
});
