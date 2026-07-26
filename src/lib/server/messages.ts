/**
 * Server-side message strings (email templates, auth subjects, etc.).
 * Kept separate from the Paraglide client messages so the Better Auth
 * CLI (`auth generate`) can resolve them without needing SvelteKit's `$lib` alias.
 */

export type Locale = 'en' | 'de' | 'es' | 'it';

export function email_otp_subject(locale?: Locale): string {
	switch (locale) {
		case 'de':
			return 'Dein Bestätigungscode: {otp}';
		case 'es':
			return 'Tu código de verificación: {otp}';
		case 'it':
			return 'Il tuo codice di verifica: {otp}';
		default:
			return 'Your verification code: {otp}';
	}
}

export function email_otp_body(locale?: Locale): string {
	switch (locale) {
		case 'de':
			return 'Dein Bestätigungscode lautet: <strong>{otp}</strong>. Dieser Code läuft in 5 Minuten ab.';
		case 'es':
			return 'Tu código de verificación es: <strong>{otp}</strong>. Este código expira en 5 minutos.';
		case 'it':
			return 'Il tuo codice di verifica è: <strong>{otp}</strong>. Questo codice scade in 5 minuti.';
		default:
			return 'Your verification code is: <strong>{otp}</strong>. This code expires in 5 minutes.';
	}
}

export function email_app_name(_locale?: Locale) {
	return 'Ace Blocker';
}

export function email_verification_subject(locale?: Locale): string {
	switch (locale) {
		case 'de':
			return 'Bestätige deine E-Mail';
		case 'es':
			return 'Verifica tu correo electrónico';
		case 'it':
			return 'Verifica la tua email';
		default:
			return 'Verify your email';
	}
}

export function email_verification_body(locale?: Locale): string {
	switch (locale) {
		case 'de':
			return 'Klicke auf den Button unten, um deine E-Mail-Adresse zu bestätigen.';
		case 'es':
			return 'Haz clic en el botón de abajo para verificar tu dirección de correo electrónico.';
		case 'it':
			return 'Clicca il pulsante qui sotto per verificare il tuo indirizzo email.';
		default:
			return 'Click the button below to verify your email address.';
	}
}

export function email_verification_button(locale?: Locale): string {
	switch (locale) {
		case 'de':
			return 'E-Mail bestätigen';
		case 'es':
			return 'Verificar correo electrónico';
		case 'it':
			return 'Verifica email';
		default:
			return 'Verify Email';
	}
}

export function email_verification_footer(locale?: Locale): string {
	switch (locale) {
		case 'de':
			return 'Falls du kein Konto erstellt hast, kannst du diese E-Mail ignorieren.';
		case 'es':
			return 'Si no creaste una cuenta, puedes ignorar este correo de forma segura.';
		case 'it':
			return 'Se non hai creato un account, puoi ignorare questa email.';
		default:
			return 'If you did not create an account, you can safely ignore this email.';
	}
}

export function email_2fa_subject(locale?: Locale): string {
	switch (locale) {
		case 'de':
			return 'Dein 2FA-Code';
		case 'es':
			return 'Tu código 2FA';
		case 'it':
			return 'Il tuo codice 2FA';
		default:
			return 'Your 2FA code';
	}
}

export function email_2fa_body(locale?: Locale): string {
	switch (locale) {
		case 'de':
			return 'Verwende den folgenden Code, um die Zwei-Faktor-Authentifizierung abzuschließen.';
		case 'es':
			return 'Usa el código a continuación para completar tu autenticación de dos factores.';
		case 'it':
			return "Usa il codice qui sotto per completare l'autenticazione a due fattori.";
		default:
			return 'Use the code below to complete your two-factor authentication.';
	}
}

export function email_2fa_footer(locale?: Locale): string {
	switch (locale) {
		case 'de':
			return 'Dieser Code läuft in wenigen Minuten ab. Falls du dies nicht angefordert hast, ignoriere diese E-Mail.';
		case 'es':
			return 'Este código expira en unos minutos. Si no lo solicitaste, ignora este correo.';
		case 'it':
			return "Questo codice scade in pochi minuti. Se non l'hai richiesto, ignora questa email.";
		default:
			return 'This code expires in a few minutes. If you did not request this, ignore this email.';
	}
}
