import { createAuthClient } from 'better-auth/client';
import { createSignal, onSettled } from 'solid-js';
import { dodopaymentsClient } from '@dodopayments/better-auth/client';
import { adminClient, twoFactorClient, emailOTPClient } from 'better-auth/client/plugins';

// Better Auth 1.7's "better-auth/solid" adapter imports the removed
// solid-js/store package and cannot run on Solid 2. Use Better Auth's
// framework-neutral client, with a minimal Solid 2 nanostore subscription.
const client = createAuthClient({
	plugins: [dodopaymentsClient(), adminClient(), twoFactorClient(), emailOTPClient()]
});

type SessionStore = typeof client.$store.atoms.session;
type SessionValue = ReturnType<SessionStore['get']>;
function useSession() {
	const atom = client.$store.atoms.session;
	const [value, setValue] = createSignal<SessionValue>(atom.get());
	onSettled(() => {
		const unsubscribe = atom.subscribe((session) => setValue(() => session));
		return unsubscribe;
	});
	return value;
}

// Proxy preserves Better Auth's dynamic plugin actions (signIn.email, etc.)
// while overriding the vanilla useSession atom with a Solid 2 accessor.
export const authClient = new Proxy(client, {
	get(target, property, receiver) {
		if (property === 'useSession') return useSession;
		return Reflect.get(target, property, receiver);
	}
}) as unknown as Omit<typeof client, 'useSession'> & { useSession: typeof useSession };
