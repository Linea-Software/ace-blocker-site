import * as m from '$lib/paraglide/messages.js';
import lightLockup from '$lib/assets/logo/ace-lockup-light-no-tagline-transparent.svg';
import darkLockup from '$lib/assets/logo/ace-lockup-dark-no-tagline-transparent.svg';

export default function AuthMobileHeader(props: {
	switchHref: '/signup' | '/signin';
	switchLabel: string;
}) {
	return (
		<div class="mb-8 flex w-full max-w-md items-center justify-between border-b border-border pb-5 lg:hidden">
			<a href="/" class="inline-flex min-h-11 items-center">
				<img src={lightLockup} alt={m.site_brand_name()} class="h-10 w-auto dark:hidden" />
				<img
					src={darkLockup}
					alt={m.site_brand_name()}
					class="hidden h-10 w-auto dark:block"
				/>
			</a>
			<a
				href={props.switchHref}
				class="inline-flex min-h-10 items-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
			>
				{props.switchLabel}
			</a>
		</div>
	);
}
