import { httpStatus } from '@solidjs/web';
import { Title } from '@solidjs/meta';
import { localizeHref } from '$lib/paraglide/runtime';
import * as m from '$lib/paraglide/messages';
import Navbar from '$lib/components/Navbar';
import MarketingFooter from '$lib/components/marketing/MarketingFooter';
export default function NotFound() {
	httpStatus(404);
	return (
		<>
			<Title>404 — Ace Blocker</Title>
			<Navbar />
			<main id="main-content" class="ace-shell min-h-[55vh] py-16">
				<p class="font-mono text-sm">404</p>
				<h1 class="font-display text-4xl font-semibold">{m.demo_browser_404_title()}</h1>
				<p class="mt-4">{m.demo_browser_404_description()}</p>
				<a class="mt-6 inline-block underline" href={localizeHref('/')}>
					{m.pro_success_home()}
				</a>
			</main>
			<MarketingFooter />
		</>
	);
}
