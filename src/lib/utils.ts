import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export type LinkEngineResult = { success: true } | { success: false; error: string };

/**
 * POST the desktop-app API key to the local engine. Delivering it as a JSON
 * body keeps the key out of URLs (query strings land in access logs, browser
 * history and process args).
 */
export async function postApiKeyToEngine(engineUrl: string, apiKey: string): Promise<boolean> {
	try {
		const res = await fetch(engineUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ apiKey })
		});
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Build the `aceblocker://` deep link. Parameters are placed in the URL
 * fragment (#...) instead of the query string: fragments are never sent over
 * HTTP and stay out of engine access logs (the engine's protocol handler
 * parses the fragment and forwards the key as a JSON body).
 */
export function buildEngineLinkUrl(apiKey: string, callback?: string): string {
	const params = new URLSearchParams({ apiKey });
	if (callback) params.set('callback', callback);
	return `aceblocker://account/api-key#${params.toString()}`;
}

/**
 * Links the engine by sending the API key to it.
 * Tries the engine web server directly via HTTPS first, falls back to the custom protocol.
 *
 * @param enginePort - The port the engine is listening on
 * @param createApiKey - Async function that returns the API key string
 * @returns LinkEngineResult indicating success or failure
 */
export async function linkEngine(
	enginePort: number,
	createApiKey: () => Promise<string>
): Promise<LinkEngineResult> {
	try {
		const apiKey = await createApiKey();
		const engineUrl = `https://127.0.0.1:${enginePort}/account/api-key`;
		const protocolUrl = buildEngineLinkUrl(apiKey);

		console.log(`Calling engine at ${engineUrl}`);
		// Try the engine directly via HTTPS (key in JSON body, not the URL)
		const delivered = await postApiKeyToEngine(engineUrl, apiKey);
		if (delivered) {
			return { success: true };
		}

		// Fall back to the custom protocol handler (key in URL fragment)
		console.warn('Direct engine link failed, falling back to custom protocol');
		window.location.href = protocolUrl;
		return { success: true };
	} catch (err) {
		return { success: false, error: String(err) };
	}
}
