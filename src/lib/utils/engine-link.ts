import { apiClient } from '$lib/api-client';
import { buildEngineLinkUrl, postApiKeyToEngine } from '$lib/utils';

/**
 * Creates an API key for the desktop engine and tries to deliver it to the
 * local engine. Returns `true` when the key was delivered directly (caller
 * should finish the link flow); when the local engine is unreachable the
 * `aceblocker://` deep link is opened instead and `false` is returned.
 */
export async function deliverApiKeyToEngine(): Promise<boolean> {
	const { data, error: apiError } = await apiClient.v1.account['api-key'].create.get();

	if (apiError) throw new Error((apiError.value as string) || 'Failed to link engine');
	if (!data) throw new Error('Failed to link engine');

	const apiKey = data.apiKey;

	const localUrl = 'https://ace-engine.local/account/api-key';
	const protocolUrl = buildEngineLinkUrl(apiKey);

	try {
		// Try the local engine first via HTTPS (key in JSON body, not the URL)
		const delivered = await postApiKeyToEngine(localUrl, apiKey);
		if (delivered) return true;
		window.location.href = protocolUrl;
		return false;
	} catch (err) {
		// If local engine is not reachable or CORS fails, fall back to custom protocol
		console.warn('Local engine link failed, falling back to protocol:', err);
		window.location.href = protocolUrl;
		return false;
	}
}
