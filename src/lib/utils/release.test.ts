import { describe, expect, it } from 'vitest';
import { isRecentRelease, RECENT_RELEASE_WINDOW_MS } from './release';

describe('isRecentRelease', () => {
	const now = new Date('2026-09-08T10:00:00Z');

	it('accepts releases younger than two weeks', () => {
		const createdAt = new Date(now.getTime() - RECENT_RELEASE_WINDOW_MS + 1);
		expect(isRecentRelease(createdAt, now)).toBe(true);
	});

	it('rejects releases exactly two weeks old', () => {
		const createdAt = new Date(now.getTime() - RECENT_RELEASE_WINDOW_MS);
		expect(isRecentRelease(createdAt, now)).toBe(false);
	});

	it('rejects future release timestamps', () => {
		const createdAt = new Date(now.getTime() + 1);
		expect(isRecentRelease(createdAt, now)).toBe(false);
	});
});
