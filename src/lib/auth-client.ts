import { createAuthClient } from 'better-auth/svelte';
import { dodopaymentsClient } from '@dodopayments/better-auth';
import { adminClient, twoFactorClient, emailOTPClient } from 'better-auth/client/plugins';
import { PUBLIC_BETTER_AUTH_URL } from '$env/static/public';

export const authClient = createAuthClient({
	baseURL: PUBLIC_BETTER_AUTH_URL,
	plugins: [dodopaymentsClient(), adminClient(), twoFactorClient(), emailOTPClient()]
});
