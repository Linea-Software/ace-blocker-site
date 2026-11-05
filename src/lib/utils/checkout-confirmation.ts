/**
 * A checkout return is not proof that billing completed. Dodo and its webhook
 * can take a few seconds to establish the entitlement. Check a bounded number
 * of times and let the user retry explicitly afterwards.
 */
export async function pollForProConfirmation(
	check: () => Promise<boolean>,
	wait: () => Promise<void>,
	maxAttempts = 4
): Promise<'active' | 'pending'> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		if (await check()) return 'active';
		if (attempt < maxAttempts - 1) await wait();
	}
	return 'pending';
}
