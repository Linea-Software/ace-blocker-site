import BrandLogo from '$lib/components/BrandLogo';
import * as m from '$lib/paraglide/messages';
import { localizeHref } from '$lib/paraglide/runtime';

export default function MarketingFooter() {
	return (
		<footer class="border-t border-border bg-card">
			<div class="ace-shell grid gap-8 py-10 sm:grid-cols-[1fr_auto] sm:items-end">
				<div>
					<a href={localizeHref('/')} class="inline-flex items-center">
						<BrandLogo alt={m.site_brand_name()} class="h-11 w-auto sm:h-12" />
					</a>
					<p class="mt-4 max-w-md text-sm text-muted-foreground">
						{m.footer_identity_line()}
					</p>
				</div>
				<div class="sm:text-right">
					<nav class="flex gap-5 text-sm" aria-label={m.footer_legal_navigation()}>
						<a href={localizeHref('/terms')} class="hover:underline">
							{m.footer_terms()}
						</a>
						<a href={localizeHref('/privacy')} class="hover:underline">
							{m.footer_privacy()}
						</a>
					</nav>
					<p class="mt-4 text-xs text-muted-foreground">
						&copy; {new Date().getFullYear()} {m.footer_rights_suffix()}
					</p>
				</div>
			</div>
		</footer>
	);
}
