/**
 * Maps Tabler icon class names (stored in the engine's `icon` field) to Tabler CSS webfont classes.
 * Used with Tabler Icons webfont via `<i class="ti ti-*">`.
 */
export const LIST_ICON_MAP: Record<string, string> = {
	'ti-eye-off': 'ti-eye-off',
	'ti-messages': 'ti-messages',
	'ti-device-gamepad-2': 'ti-device-gamepad-2',
	'ti-cards': 'ti-cards',
	'ti-player-play': 'ti-player-play',
	'ti-news': 'ti-news',
};

export const FALLBACK_ICON = 'ti-database';

/**
 * Resolve a Tabler icon class name to a valid Tabler CSS class.
 * Returns `FALLBACK_ICON` if the slug is null, undefined, or unrecognized.
 */
export function getListIconClass(slug: string | null | undefined): string {
	if (!slug) return FALLBACK_ICON;
	return LIST_ICON_MAP[slug] ?? FALLBACK_ICON;
}
