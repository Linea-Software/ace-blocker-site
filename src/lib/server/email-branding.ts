import darkLogoDataUrl from '$lib/assets/logo/ace-lockup-dark.png?inline';
import lightLogoDataUrl from '$lib/assets/logo/ace-lockup-light.png?inline';

export const DARK_LOGO_CID = 'ace-blocker-logo-dark';
export const LIGHT_LOGO_CID = 'ace-blocker-logo-light';

/**
 * Vite bundles the official PNG assets as data URLs. Pass their base64 content
 * to Resend so the CID attachments never depend on a CDN URL or server disk path.
 */
export const emailLogoAttachments = [
	{
		content: darkLogoDataUrl.split(',')[1],
		filename: 'ace-lockup-dark.png',
		contentType: 'image/png',
		contentId: DARK_LOGO_CID
	},
	{
		content: lightLogoDataUrl.split(',')[1],
		filename: 'ace-lockup-light.png',
		contentType: 'image/png',
		contentId: LIGHT_LOGO_CID
	}
];
