export type PlatformIconProps = {
	size?: number;
	stroke?: number;
	'aria-hidden'?: 'true' | 'false';
};
export function IconBrandWindows(props: PlatformIconProps) {
	return (
		<svg
			{...props}
			width={props.size ?? 24}
			height={props.size ?? 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width={props.stroke ?? 1.5}
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M3 5.5 10.5 4v7.5H3zM13 3.5l8-1v9h-8zM3 13h7.5v7L3 18.5zM13 13h8v8.5l-8-1z" />
		</svg>
	);
}
export function IconBrandApple(props: PlatformIconProps) {
	return (
		<svg
			{...props}
			width={props.size ?? 24}
			height={props.size ?? 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width={props.stroke ?? 1.5}
			stroke-linejoin="round"
			stroke-linecap="round"
			aria-hidden="true"
		>
			<path d="M12 8c-2-2-4-2.5-5.8-.9C1 11.5 5 20.5 8 21c1 .2 2-.7 4-.7s3 .9 4 .7c2.8-.5 5.8-6.8 3.5-9.2-.8-.8-1.3-1.3-2.5-1.8" />
			<path d="M12 8c0-3 2.3-5 5-5-.2 2.8-2.1 5-5 5Z" />
		</svg>
	);
}
export function IconBrandUbuntu(props: PlatformIconProps) {
	return (
		<svg
			{...props}
			width={props.size ?? 24}
			height={props.size ?? 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width={props.stroke ?? 1.5}
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="6.5" />
			<circle cx="5" cy="6" r="1.5" />
			<circle cx="20" cy="10" r="1.5" />
			<circle cx="10" cy="20" r="1.5" />
			<path d="M7 8 6.5 10M18.5 11.5 17 13.5M11 18.5l-1-1.5" />
		</svg>
	);
}
