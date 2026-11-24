/** Enforce the body limit on the actual bytes, including chunked requests. */
export async function readBoundedJson(
	request: Request,
	limit = 1024
): Promise<Record<string, unknown> | Response> {
	if (Number(request.headers.get('content-length') || 0) > limit)
		return new Response('Request too large', { status: 413 });
	const reader = request.body?.getReader();
	if (!reader) return new Response('Invalid JSON', { status: 400 });
	const decoder = new TextDecoder();
	let size = 0;
	let body = '';
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > limit) {
				await reader.cancel().catch(() => {});
				return new Response('Request too large', { status: 413 });
			}
			body += decoder.decode(value, { stream: true });
		}
		const parsed: unknown = JSON.parse(body + decoder.decode());
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
			return parsed as Record<string, unknown>;
	} catch {
		// Malformed or interrupted request.
	} finally {
		reader.releaseLock();
	}
	return new Response('Invalid JSON', { status: 400 });
}
