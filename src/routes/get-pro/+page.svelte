<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		Check,
		Shield,
		Zap,
		LayoutGrid,
		Smartphone,
		Lock,
		Infinity,
		ShieldAlert,
		Globe,
		ArrowRight
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let billingCycle = $state('yearly');
	const session = authClient.useSession();

	function handleUpgrade() {
		if ($session.data) {
			const slug = billingCycle === 'yearly' ? 'ace_blocker_yearly' : 'ace_blocker_monthly';
			goto(`/checkout?slug=${slug}`);
		} else {
			goto('/signin');
		}
	}
</script>

<Navbar />

<main class="min-h-[calc(100vh-4rem)] bg-muted/30 py-16 md:py-24">
	<div class="container mx-auto px-4">
		<!-- Header -->
		<div class="mx-auto mb-8 max-w-2xl space-y-4 text-center">
			<Badge variant="outline" class="border-primary/20 px-3 py-1 text-sm font-medium text-primary">
				Pricing Plans
			</Badge>
			<h1 class="text-4xl font-extrabold tracking-tight md:text-5xl">
				{m.pro_title()}
			</h1>
			<p class="text-xl text-muted-foreground">
				{m.pro_subtitle()}
			</p>
		</div>

		<!-- Billing Toggle -->
		<div class="mb-12 flex justify-center">
			<Tabs.Root bind:value={billingCycle} class="w-full max-w-[400px]">
				<Tabs.List class="grid w-full grid-cols-2">
					<Tabs.Trigger value="monthly">Monthly</Tabs.Trigger>
					<Tabs.Trigger value="yearly">
						Yearly
						<Badge
							variant="secondary"
							class="ml-2 border-transparent bg-primary/10 px-1.5 py-0 text-[10px] text-primary hover:bg-primary/10"
							>30% OFF</Badge
						>
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</div>

		<!-- Pricing Grid -->
		<div class="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-8 md:grid-cols-2">
			<!-- Free Plan -->
			<Card.Root
				class="relative flex flex-col overflow-hidden border-2 border-transparent bg-background shadow-sm"
			>
				<Card.Header class="pb-8">
					<div class="mb-4 flex items-start justify-between">
						<Card.Title class="text-2xl font-bold">{m.plan_free_name()}</Card.Title>
					</div>
					<div class="mb-2 flex items-baseline gap-1">
						<span class="text-4xl font-extrabold">{m.plan_free_price()}</span>
					</div>
					<Card.Description>{m.plan_free_description()}</Card.Description>
				</Card.Header>
				<Card.Content class="flex-1 space-y-4">
					<div class="flex items-center gap-3">
						<div
							class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted"
						>
							<Check class="h-3 w-3 text-muted-foreground" />
						</div>
						<span class="text-sm font-medium text-muted-foreground"
							>{m.feature_basic_blocking()}</span
						>
					</div>
					<div class="flex items-center gap-3">
						<div
							class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted"
						>
							<Check class="h-3 w-3 text-muted-foreground" />
						</div>
						<span class="text-sm font-medium text-muted-foreground">{m.feature_devices_free()}</span
						>
					</div>
				</Card.Content>
				<Card.Footer class="pt-8">
					<Button variant="outline" class="h-11 w-full" href="/signup">
						{m.cta_get_started()}
					</Button>
				</Card.Footer>
			</Card.Root>

			<!-- Pro Plan -->
			<Card.Root
				class="relative flex flex-col overflow-hidden border-2 border-primary bg-background shadow-2xl md:-mt-4 md:-mb-4"
			>
				<!-- 
				<div class="absolute top-0 right-0 p-0 m-0 overflow-hidden w-32 h-32 pointer-events-none">
					<div class="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest text-center py-1 absolute top-6 -right-8 w-32 rotate-45 shadow-sm">
						Popular
					</div>
				</div>
				-->
				<Card.Header class="pb-8">
					<div class="mb-4 flex items-start justify-between">
						<Card.Title class="text-2xl font-bold text-primary">{m.plan_pro_name()}</Card.Title>
						<!-- <Badge class="bg-primary/20 text-primary border-transparent">BEST VALUE</Badge> -->
					</div>
					<div class="mb-2 flex flex-col">
						<div class="flex items-baseline gap-1">
							{#if billingCycle === 'yearly'}
								<div class="absolute top-4 right-4 animate-in duration-300 fade-in zoom-in">
									<Badge
										class="bg-primary px-3 py-1 text-sm font-bold text-primary-foreground shadow-md"
									>
										30% OFF
									</Badge>
								</div>
								<div class="flex flex-col">
									<div class="flex items-baseline gap-1">
										<span class="text-5xl font-extrabold tracking-tight">$24.99</span>
										<span class="font-medium text-muted-foreground">/year</span>
									</div>
								</div>
							{:else}
								<span class="text-5xl font-extrabold tracking-tight">$2.99</span>
								<span class="font-medium text-muted-foreground">/month</span>
							{/if}
						</div>
						<span class="mt-1 text-[10px] leading-relaxed text-muted-foreground">
							*Taxes included. Price at checkout will be converted to your local currency.
						</span>
					</div>
					<Card.Description>{m.plan_pro_description()}</Card.Description>
				</Card.Header>
				<Card.Content class="flex-1 space-y-4">
					<div class="flex items-center gap-3">
						<div
							class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary"
						>
							<Check class="h-3 w-3 text-primary-foreground" />
						</div>
						<span class="text-sm font-bold">{m.feature_devices_pro()}</span>
					</div>
					<div class="flex items-center gap-3">
						<div
							class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary"
						>
							<Check class="h-3 w-3 text-primary-foreground" />
						</div>
						<span class="text-sm font-bold">{m.feature_scripts_pro()}</span>
					</div>
					<div class="flex items-center gap-3">
						<div
							class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary"
						>
							<Check class="h-3 w-3 text-primary-foreground" />
						</div>
						<span class="text-sm font-bold">{m.feature_lists_pro()}</span>
					</div>
					<div class="flex items-center gap-3">
						<div
							class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary"
						>
							<Check class="h-3 w-3 text-primary-foreground" />
						</div>
						<span class="text-sm font-bold">{m.feature_prevention_pro()}</span>
					</div>
				</Card.Content>
				<Card.Footer class="pt-8">
					<Button
						class="h-12 w-full text-lg font-bold shadow-lg shadow-primary/25"
						onclick={handleUpgrade}
					>
						{m.cta_upgrade_now()}
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>

		<!-- Refined Features Section -->
		<div class="mx-auto mt-32 max-w-6xl">
			<div class="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
				<div class="space-y-8">
					<div class="space-y-4">
						<h2 class="text-3xl font-bold tracking-tight">The ultimate focus toolbox.</h2>
						<p class="text-lg text-muted-foreground">
							Don't just block sites. Change your relationship with the internet using our advanced
							features designed for deep work.
						</p>
					</div>

					<div class="grid grid-cols-1 gap-6">
						<div
							class="flex gap-4 rounded-xl border bg-background/50 p-4 transition-colors hover:bg-background"
						>
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10"
							>
								<Infinity class="h-6 w-6 text-primary" />
							</div>
							<div>
								<h3 class="font-bold">{m.feature_devices_pro()}</h3>
								<p class="text-sm text-muted-foreground">
									Protect your entire digital ecosystem—laptop, desktop, and mobile.
								</p>
							</div>
						</div>

						<div
							class="flex gap-4 rounded-xl border bg-background/50 p-4 transition-colors hover:bg-background"
						>
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10"
							>
								<Zap class="h-6 w-6 text-blue-500" />
							</div>
							<div>
								<h3 class="font-bold">{m.feature_scripts_pro()}</h3>
								<p class="text-sm text-muted-foreground">
									Make addictive sites boring by stripping away reels, infinite scrolls, and
									notifications.
								</p>
							</div>
						</div>

						<div
							class="flex gap-4 rounded-xl border bg-background/50 p-4 transition-colors hover:bg-background"
						>
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/10"
							>
								<LayoutGrid class="h-6 w-6 text-green-500" />
							</div>
							<div>
								<h3 class="font-bold">{m.feature_lists_pro()}</h3>
								<p class="text-sm text-muted-foreground">
									Stop hunting for blocklists. We provide expertly curated lists for all major
									distractions.
								</p>
							</div>
						</div>

						<div
							class="flex gap-4 rounded-xl border bg-background/50 p-4 transition-colors hover:bg-background"
						>
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/10"
							>
								<ShieldAlert class="h-6 w-6 text-purple-500" />
							</div>
							<div>
								<h3 class="font-bold">{m.feature_prevention_pro()}</h3>
								<p class="text-sm text-muted-foreground">
									Add layers of friction that make it impossible to give in when willpower is low.
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Visual Representation Section -->
				<div
					class="relative flex aspect-square items-center justify-center rounded-3xl border-2 border-primary/5 bg-gradient-to-br from-primary/5 to-primary/10 p-8"
				>
					<div class="w-full max-w-xs space-y-6">
						<div
							class="-rotate-3 transform rounded-2xl border-2 border-primary bg-background p-4 shadow-xl transition-transform hover:rotate-0"
						>
							<div class="mb-4 flex items-center gap-3">
								<div
									class="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary"
								>
									<Globe class="h-4 w-4" />
								</div>
								<div class="h-2 w-24 rounded bg-muted"></div>
							</div>
							<div class="space-y-2">
								<div
									class="flex h-8 w-full items-center justify-between rounded-md bg-primary/10 px-3"
								>
									<div class="h-2 w-20 rounded bg-primary/30"></div>
									<div class="h-4 w-4 rounded-full bg-primary"></div>
								</div>
							</div>
						</div>

						<div
							class="translate-x-12 rotate-6 transform rounded-2xl border border-border bg-background p-4 shadow-xl transition-transform hover:rotate-0"
						>
							<div class="mb-4 flex items-center gap-2">
								<Shield class="h-4 w-4 text-primary" />
								<div class="h-2 w-32 rounded bg-muted"></div>
							</div>
							<div class="mb-2 h-2 w-full rounded bg-muted"></div>
							<div class="h-2 w-2/3 rounded bg-muted"></div>
						</div>

						<div class="flex justify-center pt-8">
							<div class="rounded-full bg-primary p-3 text-primary-foreground shadow-2xl">
								<ArrowRight class="h-6 w-6" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>

<footer
	class="border-t bg-background py-16 transition-colors duration-500 dark:border-slate-800 dark:bg-slate-950"
>
	<div class="container mx-auto px-4">
		<div class="flex flex-col items-center justify-between gap-8 md:flex-row">
			<div class="flex items-center gap-3">
				<Shield class="h-7 w-7 text-primary dark:text-amber-500" />
				<span class="text-xl font-bold tracking-tight dark:text-white">{m.hero_title_app()}</span>
			</div>
			<p class="text-sm text-muted-foreground dark:text-slate-500">
				&copy; {new Date().getFullYear()}
				{m.footer_rights_suffix()}
			</p>
			<div class="flex items-center gap-8">
				<a
					href="/terms"
					class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground dark:text-slate-400 dark:hover:text-white"
					>{m.footer_terms()}</a
				>
				<a
					href="/privacy"
					class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground dark:text-slate-400 dark:hover:text-white"
					>{m.footer_privacy()}</a
				>
			</div>
		</div>
	</div>
</footer>
