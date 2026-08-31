/**
 * Server-side message strings (email subjects, auth config values).
 *
 * Kept synchronous and free of $lib imports so the Better Auth CLI
 * (`auth generate`) can resolve this module without SvelteKit's alias.
 *
 * For email body/footer/button content, use Paraglide via email.ts instead.
 */

export type Locale = 'en' | 'de' | 'es' | 'it' | 'pt' | 'fr' | 'pt-BR';

/** Same in every language — safe for CLI context. */
export function email_app_name(_locale?: Locale) {
	return 'Ace Blocker';
}

/** Used by Better Auth emailVerification callback (subject line). */
export function email_verification_subject(locale?: Locale): string {
	switch (locale) {
		case 'de': return 'Bestätige deine E-Mail';
		case 'es': return 'Verifica tu correo electrónico';
		case 'it': return 'Verifica la tua email';
		case 'pt': return 'Verifique o seu e-mail';
		case 'fr': return 'Vérifiez votre adresse e-mail';
		case 'pt-BR': return 'Verifique seu e-mail';
		default: return 'Verify your email';
	}
}

/** Used by Better Auth twoFactor callback (subject line). */
export function email_2fa_subject(locale?: Locale): string {
	switch (locale) {
		case 'de': return 'Dein 2FA-Code — Ace Blocker';
		case 'es': return 'Tu código 2FA — Ace Blocker';
		case 'it': return 'Il tuo codice 2FA — Ace Blocker';
		case 'pt': return 'Seu código 2FA — Ace Blocker';
		case 'fr': return 'Votre code 2FA — Ace Blocker';
		case 'pt-BR': return 'Seu código 2FA — Ace Blocker';
		default: return 'Your 2FA Code — Ace Blocker';
	}
}

/** Used by Better Auth emailOTP callback (subject line, {otp} placeholder). */
export function email_otp_subject(locale?: Locale): string {
	switch (locale) {
		case 'de': return 'Dein Bestätigungscode: {otp}';
		case 'es': return 'Tu código de verificación: {otp}';
		case 'it': return 'Il tuo codice di verifica: {otp}';
		case 'pt': return 'Seu código de verificação: {otp}';
		case 'fr': return 'Votre code de vérification : {otp}';
		case 'pt-BR': return 'Seu código de verificação: {otp}';
		default: return 'Your verification code: {otp}';
	}
}
