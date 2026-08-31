import { sendWelcomeEmail } from './email';
import { createLogger } from './logger';
import type { Locale } from './messages';

const log = createLogger('auth:welcome-email');

/**
 * Better Auth `databaseHooks.user.create.after` handler: sends the welcome
 * email for real signups only.
 *
 * Seeder and other server-side user creation call `auth.api.createUser`
 * without a request, so their context is null — those users must not receive
 * the welcome email. A welcome-email failure is logged and swallowed so a
 * transient email outage never breaks account creation.
 */
export async function handleUserCreatedAfter(
	user: { email: string; locale?: string },
	context: unknown
): Promise<void> {
	if (!context) return;
	const locale = ((user as { locale?: string }).locale ?? 'en') as Locale;
	try {
		await sendWelcomeEmail(user.email, locale);
	} catch (err) {
		log.error({ err }, 'Failed to send welcome email');
	}
}
