export const RECENT_RELEASE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function isRecentRelease(createdAt: Date, now = new Date()): boolean {
	const ageMs = now.getTime() - createdAt.getTime();
	return ageMs >= 0 && ageMs < RECENT_RELEASE_WINDOW_MS;
}
