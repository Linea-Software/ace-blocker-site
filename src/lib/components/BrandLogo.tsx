import { Show } from 'solid-js';
import darkLockup from '$lib/assets/logo/ace-lockup-dark-no-tagline-transparent.svg';
import lightLockup from '$lib/assets/logo/ace-lockup-light-no-tagline-transparent.svg';
export default function BrandLogo(props: {
	alt: string;
	class?: string;
	variant?: 'auto' | 'light' | 'dark';
}) {
	return (
		<Show
			when={(props.variant ?? 'auto') === 'auto'}
			fallback={
				<img
					src={props.variant === 'dark' ? darkLockup : lightLockup}
					alt={props.alt}
					class={props.class ?? ''}
				/>
			}
		>
			<>
				<img src={lightLockup} alt={props.alt} class={`${props.class ?? ''} dark:hidden`} />
				<img
					src={darkLockup}
					alt={props.alt}
					class={`${props.class ?? ''} hidden dark:block`}
					aria-hidden="true"
				/>
			</>
		</Show>
	);
}
