import { createAuthClient } from 'better-auth/svelte';
import { dodopaymentsClient } from '@dodopayments/better-auth';
import { adminClient } from 'better-auth/client/plugins';
import { env } from '$env/dynamic/public';

export const authClient = createAuthClient({
	baseURL: env.PUBLIC_BETTER_AUTH_URL,
	plugins: [dodopaymentsClient(), adminClient()]
});
