import { apiClient } from '$lib/api-client';
import { buildEngineLinkUrl } from '$lib/utils';

/**
 * Request a desktop account import through the OS protocol handler.
 *
 * A browser has no way to read the result of the engine's authenticated
 * remoc request. Successful navigation here is NOT a license confirmation.
 */
export async function deliverApiKeyToEngine(): Promise<'pending'> {
	const { data, error: apiError } = await apiClient.v1.account['api-key'].create.get();
	if (apiError) throw new Error((apiError.value as string) || 'Failed to create account key');
	if (!data?.apiKey) throw new Error('Failed to create account key');

	window.location.href = buildEngineLinkUrl(data.apiKey);
	return 'pending';
}
