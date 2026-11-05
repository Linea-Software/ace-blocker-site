import { describe, expect, it, vi } from 'vitest';
import { pollForProConfirmation } from './checkout-confirmation';

describe('bounded Pro confirmation', () => {
	it('stops immediately when Dodo confirms an active subscription', async () => {
		const check = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
		const wait = vi.fn().mockResolvedValue(undefined);
		expect(await pollForProConfirmation(check, wait)).toBe('active');
		expect(check).toHaveBeenCalledTimes(2);
		expect(wait).toHaveBeenCalledTimes(1);
	});

	it('stops polling after four checks even if no webhook has arrived', async () => {
		const check = vi.fn().mockResolvedValue(false);
		const wait = vi.fn().mockResolvedValue(undefined);
		expect(await pollForProConfirmation(check, wait)).toBe('pending');
		expect(check).toHaveBeenCalledTimes(4);
		expect(wait).toHaveBeenCalledTimes(3);
	});

	it('propagates verification errors rather than pretending a purchase succeeded', async () => {
		await expect(
			pollForProConfirmation(
				vi.fn().mockRejectedValue(new Error('provider unavailable')),
				vi.fn()
			)
		).rejects.toThrow('provider unavailable');
	});
});
