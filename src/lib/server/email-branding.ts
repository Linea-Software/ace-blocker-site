const DARK_LOGO_URL = 'https://cdn.aceblocker.com/dark-full-logo.png';
const LIGHT_LOGO_URL = 'https://cdn.aceblocker.com/light-full-logo.png';

export const DARK_LOGO_CID = 'ace-blocker-logo-dark';
export const LIGHT_LOGO_CID = 'ace-blocker-logo-light';

/**
 * Resend fetches these CDN assets when sending and embeds them as inline MIME
 * attachments. Email clients can therefore render the logo without making a
 * separate remote-image request.
 */
export const emailLogoAttachments = [
	{
		path: DARK_LOGO_URL,
		filename: 'dark-full-logo.png',
		contentType: 'image/png',
		contentId: DARK_LOGO_CID
	},
	{
		path: LIGHT_LOGO_URL,
		filename: 'light-full-logo.png',
		contentType: 'image/png',
		contentId: LIGHT_LOGO_CID
	}
];
