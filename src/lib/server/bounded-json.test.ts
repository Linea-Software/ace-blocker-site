import { describe, expect, it } from 'vitest';
import { readBoundedJson } from './bounded-json';

describe('bounded request JSON', () => {
	it('reads a valid body without a content-length header', async () => {
		const request = new Request('https://example.invalid', {
			method: 'POST',
			body: JSON.stringify({ code: '1234' })
		});
		expect(await readBoundedJson(request)).toEqual({ code: '1234' });
	});
	it('rejects oversized bodies independently of content-length', async () => {
		const request = new Request('https://example.invalid', {
			method: 'POST',
			body: ' '.repeat(1025)
		});
		const result = await readBoundedJson(request);
		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(413);
	});
	it('rejects malformed JSON and non-objects', async () => {
		for (const body of ['{', '[]', 'null']) {
			const result = await readBoundedJson(
				new Request('https://example.invalid', { method: 'POST', body })
			);
			expect((result as Response).status).toBe(400);
		}
	});
});
