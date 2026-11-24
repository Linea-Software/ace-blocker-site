import { createEffect, createSignal, Show } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { Title, Meta } from '@solidjs/meta';
import { Check, Link2, ShieldCheck } from '@lucide/solid';
import { authClient } from '$lib/auth-client';
import * as m from '$lib/paraglide/messages.js';
import Navbar from '$lib/components/Navbar';
import MarketingFooter from '$lib/components/marketing/MarketingFooter';

const USER_CODE = /^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){2}$/;
function codeFromUrl(value: string | null) {
	const candidate = value?.toUpperCase() ?? '';
	return USER_CODE.test(candidate) ? candidate : '';
}
export default function ConnectPage() {
	const location = useLocation();
	const session = authClient.useSession();
	const urlCode = () => codeFromUrl(new URLSearchParams(location.search).get('code'));
	const [code, setCode] = createSignal(urlCode);
	const [busy, setBusy] = createSignal(false);
	const [approved, setApproved] = createSignal(false);
	const [invalid, setInvalid] = createSignal(false);
	const signInReturn = () =>
		urlCode() ? '/connect?code=' + encodeURIComponent(urlCode()) : '/connect';
	createEffect(urlCode, () => {
		setApproved(false);
		setInvalid(false);
	});

	async function approve() {
		if (busy() || approved()) return;
		if (!USER_CODE.test(code().trim().toUpperCase())) {
			setInvalid(true);
			return;
		}
		setBusy(true);
		setInvalid(false);
		try {
			const response = await fetch('/api/device-link/approve', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ code: code().trim().toUpperCase() }),
				credentials: 'same-origin'
			});
			if (!response.ok) {
				setInvalid(true);
				return;
			}
			setApproved(true);
		} catch {
			setInvalid(true);
		} finally {
			setBusy(false);
		}
	}
	return (
		<>
			<Title>{m.device_link_title()} — Ace Blocker</Title>
			<Meta name="robots" content="noindex, nofollow" />
			<Meta name="referrer" content="no-referrer" />
			<Navbar />
			<main id="main-content" class="border-b border-border">
				<div class="ace-shell grid gap-10 py-14 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] lg:py-20">
					<div>
						<p class="font-mono text-xs text-signal-deep dark:text-signal">
							{m.site_brand_name()} / {m.plan_pro_name()}
						</p>
						<h1 class="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
							{m.device_link_title()}
						</h1>
						<p class="mt-5 max-w-md leading-relaxed text-muted-foreground">
							{m.device_link_subtitle()}
						</p>
						<p class="mt-6 border-l-4 border-signal bg-signal/10 px-4 py-3 text-sm leading-relaxed">
							{m.device_link_warning()}
						</p>
					</div>
					<div
						class="rounded-lg border border-border bg-card p-5 sm:p-8"
						data-testid="device-link-form"
					>
						<Show
							when={approved()}
							fallback={
								<>
									<ol class="mb-7 space-y-3 border-b border-border pb-6 text-sm text-muted-foreground">
										<li class="flex items-center gap-3">
											<Link2
												class="size-4 shrink-0 text-signal-deep"
												aria-hidden="true"
											/>
											{m.device_link_quickstart()}
										</li>
										<li class="flex items-center gap-3">
											<Check
												class="size-4 shrink-0 text-signal-deep"
												aria-hidden="true"
											/>
											{m.device_link_mismatch()}
										</li>
									</ol>
									<Show
										when={session()?.data}
										fallback={
											<>
												<p class="mb-5 text-sm text-muted-foreground">
													{m.device_link_from_desktop()}
												</p>
												<form action="/signin" method="get">
													<input
														type="hidden"
														name="redirectTo"
														value={signInReturn()}
													/>
													<button
														type="submit"
														class="inline-flex min-h-12 items-center rounded-md bg-foreground px-5 font-semibold text-background"
													>
														{m.device_link_signin()}
													</button>
												</form>
											</>
										}
									>
										<form
											onSubmit={(e) => {
												e.preventDefault();
												void approve();
											}}
										>
											<label
												for="device-code"
												class="block text-sm font-semibold"
											>
												{m.device_link_code_label()}
											</label>
											<input
												id="device-code"
												name="device-code"
												autocomplete="off"
												autocapitalize="characters"
												spellcheck={false}
												class="mt-2 w-full rounded-md border border-border bg-background px-4 py-3 font-mono text-lg tracking-wider uppercase focus-visible:outline-2 focus-visible:outline-offset-2"
												placeholder={m.device_link_code_hint()}
												maxlength={16}
												required
												value={code()}
												onInput={(e) =>
													setCode(e.currentTarget.value.toUpperCase())
												}
											/>
											<Show when={invalid()}>
												<p role="alert" class="mt-2 text-sm text-danger">
													{m.device_link_error()}
												</p>
											</Show>
											<button
												type="submit"
												disabled={
													busy() ||
													!USER_CODE.test(code().trim().toUpperCase())
												}
												class="mt-5 inline-flex min-h-12 items-center rounded-md bg-foreground px-5 font-semibold text-background disabled:opacity-45"
											>
												{m.device_link_confirm()}
											</button>
										</form>
									</Show>
								</>
							}
						>
							<>
								<ShieldCheck class="size-10 text-success" aria-hidden="true" />
								<h2 class="mt-4 font-display text-2xl font-semibold">
									{m.device_link_success_title()}
								</h2>
								<p class="mt-3 leading-relaxed text-muted-foreground">
									{m.device_link_success_body()}
								</p>
							</>
						</Show>
					</div>
				</div>
			</main>
			<MarketingFooter />
		</>
	);
}
