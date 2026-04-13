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
		const engineUrl = `https://127.0.0.1:${enginePort}/account/api-key?apiKey=${apiKey}`;
		const protocolUrl = `aceblocker://account/api-key?apiKey=${apiKey}`;

		try {
			console.log(`Calling engine at ${engineUrl}`);
			// Try the engine directly via HTTPS
			const res = await fetch(engineUrl, { method: 'POST' });
			if (res.ok) {
				return { success: true };
			}
			// Engine returned non-ok status, fall through to protocol fallback
			console.warn('Engine returned non-ok status, falling back to custom protocol');
		} catch (err) {
			// Network error (CORS, connection refused, etc.), fall back to custom protocol
			console.warn('Direct engine link failed, falling back to custom protocol:', err);
		}

		// Fallback: use the custom protocol handler
		window.location.href = protocolUrl;
		return { success: true };
	} catch (err) {
		return { success: false, error: String(err) };
	}
}
