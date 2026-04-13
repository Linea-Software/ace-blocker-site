/**
 * Server-side message strings (email templates, auth subjects, etc.).
 * Kept separate from the Paraglide client messages so the Better Auth
 * CLI (`auth generate`) can resolve them without needing SvelteKit's `$lib` alias.
 *
 * When i18n support for server emails is added, these can be wired into Paraglide.
 */

export function email_app_name() {
	return 'Ace Blocker';
}

export function email_verification_subject() {
	return 'Verify your email';
}

export function email_verification_body() {
	return 'Click the button below to verify your email address.';
}

export function email_verification_button() {
	return 'Verify Email';
}

export function email_verification_footer() {
	return 'If you did not create an account, you can safely ignore this email.';
}

export function email_2fa_subject() {
	return 'Your 2FA code';
}

export function email_2fa_body() {
	return 'Use the code below to complete your two-factor authentication.';
}

export function email_2fa_footer() {
	return 'This code expires in a few minutes. If you did not request this, ignore this email.';
}
