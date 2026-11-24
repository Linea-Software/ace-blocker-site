import type { JSX } from '@solidjs/web';
import { HydrationScript } from '@solidjs/web';
import { getLocale } from '$lib/paraglide/runtime';

export default function Document(props: { children: JSX.Element }) {
	return (
		<html lang={getLocale()}>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" type="image/png" sizes="16x16" href="/ace-favicon-16.png" />
				<link rel="icon" type="image/png" sizes="32x32" href="/ace-favicon-32.png" />
				<link
					rel="icon"
					type="image/svg+xml"
					href="/ace-favicon.svg"
					media="(prefers-color-scheme: light)"
				/>
				<link
					rel="icon"
					type="image/svg+xml"
					href="/ace-favicon-dark.svg"
					media="(prefers-color-scheme: dark)"
				/>
				<link rel="apple-touch-icon" sizes="180x180" href="/ace-apple-touch-icon.png" />
				<script
					innerHTML={`try{var p=new URLSearchParams(location.search),t=(location.pathname.endsWith("/checkout")||location.pathname.endsWith("/checkout/"))?p.get("theme"):null,m=t==="dark"||t==="light"?t:localStorage.getItem("mode")||document.cookie.match(/(?:^|; )mode=(dark|light)(?:;|$)/)?.[1]||"light";document.documentElement.classList.toggle("dark",m==="dark");document.documentElement.style.colorScheme=m==="dark"?"dark":"light"}catch{}`}
				/>
				<HydrationScript />
			</head>
			<body>{props.children}</body>
		</html>
	);
}
