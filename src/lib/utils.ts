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

export type LinkEngineResult = { status: 'pending' } | { status: 'error'; error: string };

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
 * Ask the OS to forward the account key to Ace through its allowlisted URI
 * handler. The current desktop engine accepts remoc IPC, not a browser HTTP
 * POST, so navigation alone can NEVER confirm that the key was imported.
 */
export async function linkEngine(createApiKey: () => Promise<string>): Promise<LinkEngineResult> {
	try {
		const apiKey = await createApiKey();
		window.location.href = buildEngineLinkUrl(apiKey);
		return { status: 'pending' };
	} catch (err) {
		return { status: 'error', error: String(err) };
	}
}
